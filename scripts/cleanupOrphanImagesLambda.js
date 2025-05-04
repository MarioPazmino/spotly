//scripts/cleanupOrphanImagesLambda.js
// Adaptación del script de limpieza para AWS Lambda
const AWS = require('aws-sdk');
const { DynamoDB } = require('@aws-sdk/client-dynamodb');
const { unmarshall } = require('@aws-sdk/util-dynamodb');

const REGION = process.env.AWS_REGION || 'us-east-1';
const BUCKET = process.env.IMAGENES_CENTROS_BUCKET || 'spotly-centros-imagenes-dev';
const CANCHAS_TABLE_NAME = process.env.CANCHAS_TABLE_NAME || 'Canchas';
const CENTROS_TABLE_NAME = process.env.CENTROS_TABLE_NAME || 'CentrosDeportivos';
const S3_PREFIX = 'centros/';

const s3 = new AWS.S3({ region: REGION });
const dynamoDB = new DynamoDB({ region: REGION });

async function getAllImagenesFromTable(tableName) {
  let imagenesSet = new Set();
  let ExclusiveStartKey = undefined;
  do {
    const params = {
      TableName: tableName,
      ExclusiveStartKey,
      ProjectionExpression: 'imagenes',
    };
    const result = await dynamoDB.scan(params);
    for (const item of result.Items) {
      const entity = unmarshall(item);
      if (Array.isArray(entity.imagenes)) {
        entity.imagenes.forEach(img => {
          if (typeof img === 'string' && img.startsWith(S3_PREFIX)) {
            imagenesSet.add(img);
          }
        });
      }
    }
    ExclusiveStartKey = result.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return imagenesSet;
}

async function getAllReferencedImagenes() {
  const canchasImgs = await getAllImagenesFromTable(CANCHAS_TABLE_NAME);
  const centrosImgs = await getAllImagenesFromTable(CENTROS_TABLE_NAME);
  return new Set([...canchasImgs, ...centrosImgs]);
}

async function getAllS3Keys() {
  let ContinuationToken = undefined;
  let allKeys = [];
  do {
    const params = {
      Bucket: BUCKET,
      Prefix: S3_PREFIX,
      ContinuationToken,
    };
    const result = await s3.listObjectsV2(params).promise();
    if (result.Contents) {
      allKeys.push(...result.Contents.map(obj => obj.Key));
    }
    ContinuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
  } while (ContinuationToken);
  return allKeys;
}

exports.handler = async function(event, context) {
  const referenced = await getAllReferencedImagenes();
  const allS3Keys = await getAllS3Keys();
  const huerfanas = allS3Keys.filter(key => !referenced.has(key));
  if (huerfanas.length === 0) {
    console.log('No hay imágenes huérfanas para eliminar.');
    return { deleted: 0 };
  }
  let totalDeleted = 0;
  for (let i = 0; i < huerfanas.length; i += 1000) {
    const chunk = huerfanas.slice(i, i + 1000);
    const params = {
      Bucket: BUCKET,
      Delete: { Objects: chunk.map(Key => ({ Key })) },
    };
    await s3.deleteObjects(params).promise();
    totalDeleted += chunk.length;
    console.log(`Eliminadas ${chunk.length} imágenes.`);
  }
  console.log('Limpieza completada.');
  return { deleted: totalDeleted };
};
