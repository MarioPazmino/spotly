//scripts/cleanupOrphanImagesLambda.js
// Adaptación del script de limpieza para AWS Lambda
const AWS = require('aws-sdk');
const { DynamoDB } = require('@aws-sdk/client-dynamodb');
const { unmarshall } = require('@aws-sdk/util-dynamodb');

const REGION = process.env.AWS_REGION || 'us-east-1';
const BUCKET = process.env.IMAGENES_CENTROS_BUCKET || 'spotly-centros-imagenes-dev';
const CANCHAS_TABLE_NAME = process.env.CANCHAS_TABLE_NAME || 'Canchas';
const CENTROS_TABLE_NAME = process.env.CENTROS_TABLE_NAME || 'CentrosDeportivos';
const PAGOS_TABLE_NAME = process.env.PAGOS_TABLE_NAME || 'Pagos';
const S3_PREFIX = 'centros/';
const TRANSFERENCIAS_PREFIX = 'transferencias/';

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

async function getAllS3Keys(prefix) {
  let ContinuationToken = undefined;
  let allKeys = [];
  do {
    const params = {
      Bucket: BUCKET,
      Prefix: prefix,
      ContinuationToken,
    };
    const result = await s3.listObjectsV2(params).promise();
    if (result.Contents) {
      allKeys.push(...result.Contents.map(obj => ({
        Key: obj.Key,
        LastModified: obj.LastModified
      })));
    }
    ContinuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
  } while (ContinuationToken);
  return allKeys;
}

async function getReferencedTransferImages() {
  let imagenesSet = new Set();
  let ExclusiveStartKey = undefined;
  do {
    const params = {
      TableName: PAGOS_TABLE_NAME,
      ExclusiveStartKey,
      ProjectionExpression: 'detallesPago',
      FilterExpression: 'metodoPago = :metodo',
      ExpressionAttributeValues: {
        ':metodo': { S: 'transferencia' }
      }
    };
    const result = await dynamoDB.scan(params);
    for (const item of result.Items) {
      const entity = unmarshall(item);
      if (entity.detallesPago && entity.detallesPago.comprobanteKey) {
        imagenesSet.add(entity.detallesPago.comprobanteKey);
      }
    }
    ExclusiveStartKey = result.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return imagenesSet;
}

async function deleteObjects(keys) {
  if (keys.length === 0) return 0;
  
  let totalDeleted = 0;
  for (let i = 0; i < keys.length; i += 1000) {
    const chunk = keys.slice(i, i + 1000);
    const params = {
      Bucket: BUCKET,
      Delete: { Objects: chunk.map(Key => ({ Key })) },
    };
    await s3.deleteObjects(params).promise();
    totalDeleted += chunk.length;
    console.log(`Eliminadas ${chunk.length} imágenes.`);
  }
  return totalDeleted;
}

exports.handler = async function(event, context) {
  console.log('Iniciando limpieza de imágenes...');
  
  // 1. Limpiar imágenes huérfanas de centros y canchas
  const referenced = await getAllReferencedImagenes();
  const allS3Keys = await getAllS3Keys(S3_PREFIX);
  const huerfanas = allS3Keys
    .map(obj => obj.Key)
    .filter(key => !referenced.has(key));
  
  let totalDeleted = 0;
  if (huerfanas.length > 0) {
    console.log(`Encontradas ${huerfanas.length} imágenes huérfanas de centros/canchas.`);
    totalDeleted += await deleteObjects(huerfanas);
  } else {
    console.log('No hay imágenes huérfanas de centros/canchas para eliminar.');
  }

  // 2. Limpiar imágenes de transferencias
  const referencedTransfers = await getReferencedTransferImages();
  const allTransferKeys = await getAllS3Keys(TRANSFERENCIAS_PREFIX);
  
  // Filtrar imágenes de transferencia que:
  // a) No están referenciadas en ningún pago
  // b) O tienen más de un mes de antigüedad
  const unMesAtras = new Date();
  unMesAtras.setMonth(unMesAtras.getMonth() - 1);
  
  const transferenciasAEliminar = allTransferKeys
    .filter(obj => {
      const esHuerfana = !referencedTransfers.has(obj.Key);
      const esAntigua = obj.LastModified < unMesAtras;
      return esHuerfana || esAntigua;
    })
    .map(obj => obj.Key);

  if (transferenciasAEliminar.length > 0) {
    console.log(`Encontradas ${transferenciasAEliminar.length} imágenes de transferencias para eliminar.`);
    totalDeleted += await deleteObjects(transferenciasAEliminar);
  } else {
    console.log('No hay imágenes de transferencias para eliminar.');
  }

  console.log(`Limpieza completada. Total de imágenes eliminadas: ${totalDeleted}`);
  return { deleted: totalDeleted };
};
