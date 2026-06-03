require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Conexão com o Supabase (use a Connection String disponibilizada no painel do Supabase)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Obrigatório para conexões externas no Supabase
});

// 1. Rota para obter os polígonos dos municípios (GeoJSON)
app.get('/api/municipios', async (req, res) => {
  try {
    // ST_AsGeoJSON transforma a geometria do PostGIS em texto JSON válido
    const query = `
      SELECT id, name_muni, code_muni, ST_AsGeoJSON(geom) as geojson 
      FROM municipios_pb;
    `;
    const result = await pool.query(query);

    // Formata os dados no padrão GeoJSON FeatureCollection para facilitar no Leaflet
    const features = result.rows.map(row => ({
      type: "Feature",
      geometry: JSON.parse(row.geojson),
      properties: {
        id: row.id,
        nome: row.name_muni,
        codigo_ibge: row.code_muni
      }
    }));

    res.json({ type: "FeatureCollection", features });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar municípios" });
  }
});

// 2. Rota para buscar pontos de interesse (ex: Escolas, Hospitais) filtrados
app.get('/api/entidades', async (req, res) => {
  const { tipo } = req.query; // Exemplo de filtro por query string (?tipo=publica)
  try {
    let query = 'SELECT id, nome, tipo, latitude, longitude FROM entidades_pb';
    const params = [];

    if (tipo) {
      query += ' WHERE tipo = $1';
      params.push(tipo);
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar entidades" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API rodando na porta ${PORT}`));