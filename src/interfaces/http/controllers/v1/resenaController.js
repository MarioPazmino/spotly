const ResenaService = require('../../../../infrastructure/services/resenaService');

class ResenaController {
  constructor() {
    this.resenaService = new ResenaService();
  }

  async crearResena(req, res) {
    try {
      const resena = await this.resenaService.crearResena(req.body);
      res.status(201).json(resena);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async actualizarResena(req, res) {
    try {
      const { resenaId } = req.params;
      const resena = await this.resenaService.actualizarResena(resenaId, req.body);
      res.json(resena);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async obtenerResena(req, res) {
    try {
      const { resenaId } = req.params;
      const resena = await this.resenaService.obtenerResena(resenaId);
      res.json(resena);
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  }

  async obtenerResenasPorUsuario(req, res) {
    try {
      const { userId } = req.params;
      const resenas = await this.resenaService.obtenerResenasPorUsuario(userId);
      res.json(resenas);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async obtenerResenasPorCancha(req, res) {
    try {
      const { canchaId } = req.params;
      const resenas = await this.resenaService.obtenerResenasPorCancha(canchaId);
      res.json(resenas);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async obtenerResenasPorCentro(req, res) {
    try {
      const { centroId } = req.params;
      const resenas = await this.resenaService.obtenerResenasPorCentro(centroId);
      res.json(resenas);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async eliminarResena(req, res) {
    try {
      const { resenaId } = req.params;
      await this.resenaService.eliminarResena(resenaId);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async obtenerResenasFiltradas(req, res) {
    try {
      const { canchaId, centroId, calificacionMinima, lastEvaluatedKey, limit } = req.query;
      const resenas = await this.resenaService.obtenerResenasFiltradas({
        canchaId,
        centroId,
        calificacionMinima: calificacionMinima ? Number(calificacionMinima) : undefined,
        lastEvaluatedKey: lastEvaluatedKey ? JSON.parse(lastEvaluatedKey) : undefined,
        limit: limit ? Number(limit) : undefined
      });
      res.json(resenas);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async obtenerEstadisticasCancha(req, res) {
    try {
      const { canchaId } = req.params;
      const estadisticas = await this.resenaService.obtenerEstadisticasCancha(canchaId);
      res.json(estadisticas);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async obtenerEstadisticasCentro(req, res) {
    try {
      const { centroId } = req.params;
      const estadisticas = await this.resenaService.obtenerEstadisticasCentro(centroId);
      res.json(estadisticas);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}

module.exports = ResenaController; 