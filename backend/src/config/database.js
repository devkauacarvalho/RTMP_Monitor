/**
 * config/database.js — In-memory Mock Knex Query Builder for AI Studio
 * Provides resilient, instant zero-dependency data storage matching the CFTV schema.
 */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// Pre-compute password hashes for instant authentication
const adminHash = bcrypt.hashSync('admin123', 10);
const viewerHash = bcrypt.hashSync('viewer123', 10);

const adminUserId = '11111111-1111-1111-1111-111111111111';
const viewerUserId = '22222222-2222-2222-2222-222222222222';

const collections = {
  users: [
    {
      id: adminUserId,
      username: 'admin',
      password_hash: adminHash,
      full_name: 'Administrador Técnico',
      role: 'tech',
      is_active: true,
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: viewerUserId,
      username: 'visualizador',
      password_hash: viewerHash,
      full_name: 'Visualizador Cliente',
      role: 'viewer',
      is_active: true,
      created_by: adminUserId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  clients: [
    {
      id: 'c1',
      name: 'Condomínio Residencial Parque das Flores',
      description: 'Portaria principal, garagem e áreas comuns',
      is_active: true,
      created_by: adminUserId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  dvr_devices: [
    {
      id: 'dvr1',
      client_id: 'c1',
      name: 'DVR Portaria Principal',
      model: 'Intelbras MHDX 3108',
      total_channels: 8,
      notes: 'Canais 1 a 4 ativos',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  cameras: [
    {
      id: 'cam1',
      dvr_device_id: 'dvr1',
      channel_number: 1,
      name: 'Portão de Entrada',
      stream_token: '11111111-0000-0000-0000-000000000001',
      status: 'streaming',
      last_seen_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'cam2',
      dvr_device_id: 'dvr1',
      channel_number: 2,
      name: 'Hall Social',
      stream_token: '11111111-0000-0000-0000-000000000002',
      status: 'streaming',
      last_seen_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'cam3',
      dvr_device_id: 'dvr1',
      channel_number: 3,
      name: 'Garagem Térreo',
      stream_token: '11111111-0000-0000-0000-000000000003',
      status: 'active',
      last_seen_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'cam4',
      dvr_device_id: 'dvr1',
      channel_number: 4,
      name: 'Área da Piscina',
      stream_token: '11111111-0000-0000-0000-000000000004',
      status: 'inactive',
      last_seen_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  viewer_permissions: [
    {
      id: 'p1',
      viewer_user_id: viewerUserId,
      camera_id: 'cam1',
      granted_by: adminUserId,
      granted_at: new Date().toISOString(),
    },
    {
      id: 'p2',
      viewer_user_id: viewerUserId,
      camera_id: 'cam2',
      granted_by: adminUserId,
      granted_at: new Date().toISOString(),
    },
  ],
  server_settings: [
    {
      id: 1,
      mediamtx_host: 'localhost',
      rtmp_port: 1935,
      hls_port: 8554,
      rtmp_app_path: '/live/',
      webhook_enabled: true,
      webhook_secret: 'rtmp_media_webhook_secret_key',
      updated_at: new Date().toISOString(),
      updated_by: null,
    },
  ],
};

function parseTableName(rawName) {
  const parts = rawName.trim().split(/\s+as\s+/i);
  return {
    tableName: parts[0],
    alias: parts[1] || parts[0],
  };
}

function projectItem(item, fields) {
  if (!fields || fields.length === 0 || fields.includes('*')) {
    return { ...item };
  }
  const result = {};
  for (const f of fields) {
    if (f.includes('.') && item._joined) {
      const [alias, prop] = f.split('.');
      if (item._joined[alias] && prop in item._joined[alias]) {
        result[prop] = item._joined[alias][prop];
        continue;
      }
    }
    const cleanF = f.includes('.') ? f.split('.').pop() : f;
    if (cleanF in item) {
      result[cleanF] = item[cleanF];
    }
  }
  return result;
}

class QueryBuilder {
  constructor(rawTableName) {
    const { tableName, alias } = parseTableName(rawTableName);
    this.tableName = tableName;
    this.alias = alias;
    this.wheres = [];
    this.selectedFields = null;
    this.joins = [];
    this.order = null;
    this.isFirst = false;
    this.mutationType = null;
    this.mutationData = null;
    this.returningFields = null;

    if (!collections[this.tableName]) {
      collections[this.tableName] = [];
    }
  }

  where(...args) {
    if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
      for (const [k, v] of Object.entries(args[0])) {
        this.wheres.push({ key: k, value: v });
      }
    } else if (args.length === 2) {
      this.wheres.push({ key: args[0], value: args[1] });
    } else if (args.length === 3) {
      this.wheres.push({ key: args[0], op: args[1], value: args[2] });
    }
    return this;
  }

  select(...fields) {
    const flat = fields.flat();
    this.selectedFields = flat;
    return this;
  }

  first(...fields) {
    this.isFirst = true;
    if (fields.length > 0) {
      this.selectedFields = fields.flat();
    }
    return this;
  }

  orderBy(field, direction = 'asc') {
    this.order = { field, direction: direction.toLowerCase() };
    return this;
  }

  join(otherTableRaw, leftCol, rightCol) {
    const { tableName, alias } = parseTableName(otherTableRaw);
    this.joins.push({
      tableName,
      alias,
      leftCol,
      rightCol,
    });
    return this;
  }

  insert(data) {
    this.mutationType = 'insert';
    this.mutationData = Array.isArray(data) ? data : [data];
    return this;
  }

  update(data) {
    this.mutationType = 'update';
    this.mutationData = data;
    return this;
  }

  del() {
    this.mutationType = 'del';
    return this;
  }

  returning(fields) {
    this.returningFields = Array.isArray(fields) ? fields : [fields];
    return this;
  }

  _matchesWhere(item, w) {
    let prop = w.key;
    if (prop.includes('.')) {
      const parts = prop.split('.');
      prop = parts[1];
    }
    const val = item[prop];
    if (w.op) {
      if (w.op === '=' || w.op === '==') return val == w.value;
      if (w.op === '!=') return val != w.value;
      if (w.op === '>') return val > w.value;
      if (w.op === '<') return val < w.value;
    }
    return val === w.value;
  }

  async execute() {
    const table = collections[this.tableName] || [];

    // INSERT
    if (this.mutationType === 'insert') {
      const inserted = [];
      for (const row of this.mutationData) {
        const newRow = {
          id: row.id || crypto.randomUUID(),
          ...row,
          created_at: row.created_at || new Date().toISOString(),
          updated_at: row.updated_at || new Date().toISOString(),
        };
        if (this.tableName === 'cameras' && !newRow.stream_token) {
          newRow.stream_token = crypto.randomUUID();
        }
        table.push(newRow);
        inserted.push({ ...newRow });
      }
      return this.returningFields ? inserted : inserted.length;
    }

    // UPDATE
    if (this.mutationType === 'update') {
      const updated = [];
      for (let i = 0; i < table.length; i++) {
        let match = true;
        for (const w of this.wheres) {
          if (!this._matchesWhere(table[i], w)) {
            match = false;
            break;
          }
        }
        if (match) {
          Object.assign(table[i], this.mutationData, {
            updated_at: new Date().toISOString(),
          });
          updated.push({ ...table[i] });
        }
      }
      return this.returningFields ? updated : updated.length;
    }

    // DELETE
    if (this.mutationType === 'del') {
      let count = 0;
      for (let i = table.length - 1; i >= 0; i--) {
        let match = true;
        for (const w of this.wheres) {
          if (!this._matchesWhere(table[i], w)) {
            match = false;
            break;
          }
        }
        if (match) {
          table.splice(i, 1);
          count++;
        }
      }
      return count;
    }

    // SELECT / QUERY
    let rows = table.map((item) => ({ ...item }));

    // JOINS
    if (this.joins.length > 0) {
      for (const j of this.joins) {
        const otherTable = collections[j.tableName] || [];
        const combined = [];
        const [lAlias, lProp] = j.leftCol.split('.');
        const [rAlias, rProp] = j.rightCol.split('.');

        for (const r of rows) {
          for (const o of otherTable) {
            const leftVal = (lAlias === this.alias ? r[lProp] : o[lProp]);
            const rightVal = (rAlias === j.alias ? o[rProp] : r[rProp]);
            if (leftVal !== undefined && leftVal === rightVal) {
              combined.push({
                ...r,
                ...o,
                _joined: { [this.alias]: r, [j.alias]: o },
              });
            }
          }
        }
        rows = combined;
      }
    }

    // FILTER WHERES
    if (this.wheres.length > 0) {
      rows = rows.filter((item) => {
        for (const w of this.wheres) {
          if (!this._matchesWhere(item, w)) return false;
        }
        return true;
      });
    }

    // ORDER BY
    if (this.order) {
      const { field, direction } = this.order;
      rows.sort((a, b) => {
        const av = a[field] ?? '';
        const bv = b[field] ?? '';
        if (av < bv) return direction === 'desc' ? 1 : -1;
        if (av > bv) return direction === 'desc' ? -1 : 1;
        return 0;
      });
    }

    // PROJECTION
    const projected = rows.map((r) => projectItem(r, this.selectedFields));

    if (this.isFirst) {
      return projected[0] || null;
    }

    return projected;
  }

  then(resolve, reject) {
    return this.execute().then(resolve, reject);
  }
}

function db(tableName) {
  return new QueryBuilder(tableName);
}

db.raw = (str) => str;
db.fn = { now: () => new Date().toISOString() };

module.exports = db;
