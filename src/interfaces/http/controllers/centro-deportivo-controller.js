import Joi from 'joi';
import Boom from '@hapi/boom';

class CentroDeportivoController {
  constructor(centroDeportivoService) {
    this.centroDeportivoService = centroDeportivoService;
  }

  // Esquema de validación para crear/actualizar un centro deportivo
  #validationSchema = Joi.object({
    nombre: Joi.string().required(),
    direccion: Joi.string().required(),
    coordenadas: Joi.object({
      lat: Joi.number().required(),
      lng: Joi.number().required(),
    }).required(),
    telefono: Joi.string().required(),
    horarioApertura: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    horarioCierre: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    diasOperacion: Joi.array().items(
      Joi.string().valid('lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo')
    ).required(),
    imagenes: Joi.array().items(Joi.string().uri()),
  });

  async getAll(req, res, next) {
    try {
      const centrosDeportivos = await this.centroDeportivoService.getAllCentrosDeportivos();
      return res.json(centrosDeportivos);
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const centroDeportivo = await this.centroDeportivoService.getCentroDeportivoById(id);
      return res.json(centroDeportivo);
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const { error, value } = this.#validationSchema.validate(req.body);
      if (error) {
        throw Boom.badRequest(error.message);
      }

      const centroDeportivo = await this.centroDeportivoService.createCentroDeportivo(value);
      return res.status(201).json(centroDeportivo);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const { error, value } = this.#validationSchema.validate(req.body);
      if (error) {
        throw Boom.badRequest(error.message);
      }

      const centroDeportivo = await this.centroDeportivoService.updateCentroDeportivo(id, value);
      return res.json(centroDeportivo);
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      await this.centroDeportivoService.deleteCentroDeportivo(id);
      return res.status(204).end();
    } catch (error) {
      next(error);
    }
  }
}

export default CentroDeportivoController;
