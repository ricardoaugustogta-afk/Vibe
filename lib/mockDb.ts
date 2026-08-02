const STORAGE_KEY = 'vibe_mock_db_v1';
const DEMO_USER_ID = 'demo-user-00000000-0000-0000-0000-000000000000';

type Row = Record<string, any>;
type DBShape = {
  profiles: Row[];
  events: Row[];
  comments: Row[];
  event_reactions: Row[];
  reports: Row[];
};

function loadDB(): DBShape {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as DBShape;
  } catch {}
  const seeded = seed();
  saveDB(seeded);
  return seeded;
}

function saveDB(db: DBShape) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {}
}

function genId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'mock-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function seed(): DBShape {
  const now = Date.now();
  const iso = (offsetMs: number) => new Date(now + offsetMs).toISOString();

  return {
    profiles: [
      { id: DEMO_USER_ID, username: 'Voce', avatar_url: null, instagram_username: null, language: 'pt-BR', created_at: iso(0) },
      { id: 'user-marcos-001', username: 'marcos_slz', avatar_url: null, instagram_username: 'marcos_slz', language: 'pt-BR', created_at: iso(-86400000 * 30) },
      { id: 'user-julia-002', username: 'julia_p', avatar_url: null, instagram_username: null, language: 'pt-BR', created_at: iso(-86400000 * 20) },
      { id: 'user-pedro-003', username: 'pedro_pk', avatar_url: null, instagram_username: null, language: 'pt-BR', created_at: iso(-86400000 * 15) },
    ],
    events: [
      {
        id: 'event-live-001',
        creator_id: 'user-marcos-001',
        title: 'Role na Praca do Centro',
        description: 'Som ao vivo, comida e bebida! Traz a galera.',
        category: 'Festa',
        location: 'POINT(-55.5084 -11.8563)',
        address_text: 'Praca do Centro, Sinop - MT',
        start_time: iso(-30 * 60000),
        end_time: iso(2 * 3600000),
        hidden: false,
        created_at: iso(-35 * 60000),
        _lat: -11.8563,
        _lng: -55.5084,
      },
      {
        id: 'event-live-002',
        creator_id: 'user-pedro-003',
        title: 'Pelada no Campo Society',
        description: 'Futebol toda quarta! Chega cedo pra garantir vaga.',
        category: 'Esporte',
        location: 'POINT(-55.5150 -11.8500)',
        address_text: 'Campo Society, Sinop - MT',
        start_time: iso(-15 * 60000),
        end_time: iso(90 * 60000),
        hidden: false,
        created_at: iso(-20 * 60000),
        _lat: -11.85,
        _lng: -55.515,
      },
      {
        id: 'event-upcoming-001',
        creator_id: 'user-julia-002',
        title: 'Show de Musica no Parque',
        description: 'Banda local tocando as 18h. Entrada gratuita!',
        category: 'Musica',
        location: 'POINT(-55.5050 -11.8620)',
        address_text: 'Parque Municipal, Sinop - MT',
        start_time: iso(86400000),
        end_time: iso(86400000 + 4 * 3600000),
        hidden: false,
        created_at: iso(-3600000),
        _lat: -11.862,
        _lng: -55.505,
      },
      {
        id: 'event-upcoming-002',
        creator_id: 'user-marcos-001',
        title: 'Feira Gastronomica',
        description: 'Food trucks, cerveja artesanal e musica ao vivo.',
        category: 'Comida',
        location: 'POINT(-55.5000 -11.8450)',
        address_text: 'Av. das Flores, Sinop - MT',
        start_time: iso(3 * 86400000),
        end_time: iso(3 * 86400000 + 6 * 3600000),
        hidden: false,
        created_at: iso(-7200000),
        _lat: -11.845,
        _lng: -55.5,
      },
    ],
    comments: [
      { id: 'comment-001', event_id: 'event-live-001', user_id: 'user-marcos-001', text_content: 'Bora galera, ta comecando agora!', image_url: null, hidden: false, created_at: iso(-28 * 60000) },
      { id: 'comment-002', event_id: 'event-live-001', user_id: 'user-julia-002', text_content: 'Chegando la em 10 min!', image_url: null, hidden: false, created_at: iso(-15 * 60000) },
      { id: 'comment-003', event_id: 'event-live-002', user_id: 'user-pedro-003', text_content: 'Ja ta rolando, vaga aberta pra quem quiser!', image_url: null, hidden: false, created_at: iso(-10 * 60000) },
      { id: 'comment-004', event_id: 'event-upcoming-001', user_id: 'user-marcos-001', text_content: 'Vou levar a cerveja, alguem quer?', image_url: null, hidden: false, created_at: iso(-1800000) },
    ],
    event_reactions: [
      { id: 'react-001', event_id: 'event-live-001', user_id: 'user-julia-002', status: 'going', created_at: iso(-20 * 60000) },
      { id: 'react-002', event_id: 'event-live-001', user_id: 'user-marcos-001', status: 'liked', created_at: iso(-25 * 60000) },
      { id: 'react-003', event_id: 'event-live-001', user_id: DEMO_USER_ID, status: 'liked', created_at: iso(-10 * 60000) },
      { id: 'react-004', event_id: 'event-live-002', user_id: 'user-marcos-001', status: 'going', created_at: iso(-12 * 60000) },
      { id: 'react-005', event_id: 'event-live-002', user_id: 'user-julia-002', status: 'going', created_at: iso(-8 * 60000) },
      { id: 'react-006', event_id: 'event-live-002', user_id: 'user-pedro-003', status: 'liked', created_at: iso(-5 * 60000) },
      { id: 'react-007', event_id: 'event-upcoming-001', user_id: 'user-marcos-001', status: 'going', created_at: iso(-1200000) },
      { id: 'react-008', event_id: 'event-upcoming-001', user_id: DEMO_USER_ID, status: 'going', created_at: iso(-600000) },
      { id: 'react-009', event_id: 'event-upcoming-002', user_id: 'user-julia-002', status: 'liked', created_at: iso(-900000) },
    ],
    reports: [],
  };
}

type ChannelSub = { table: string; callback: () => void };
const registry: { channel: MockChannel }[] = [];

function emitChange(table: string) {
  for (const entry of registry) {
    if (!entry.channel.subscribed) continue;
    for (const sub of entry.channel.subs) {
      if (sub.table === table) sub.callback();
    }
  }
}

class MockChannel {
  name: string;
  subs: ChannelSub[] = [];
  subscribed = false;

  constructor(name: string) {
    this.name = name;
  }

  on(_event: string, filter: { table: string }, callback: () => void): this {
    this.subs.push({ table: filter.table, callback });
    return this;
  }

  subscribe(): this {
    this.subscribed = true;
    registry.push({ channel: this });
    return this;
  }

  unsubscribe() {
    this.subscribed = false;
    const idx = registry.findIndex((e) => e.channel === this);
    if (idx >= 0) registry.splice(idx, 1);
  }
}

class MockQueryBuilder {
  private table: string;
  private filters: { column: string; value: any }[] = [];
  private orderClause: { column: string; ascending: boolean } | null = null;
  private limitVal: number | null = null;
  private selectColumns: string | null = null;
  private selectOpts: { count?: string; head?: boolean } = {};
  private insertPayload: any = null;
  private updatePayload: any = null;
  private isDelete = false;
  private isUpsert = false;
  private singleMode: 'single' | 'maybeSingle' | null = null;

  constructor(table: string) {
    this.table = table;
  }

  select(columns?: string, options?: { count?: string; head?: boolean }): this {
    this.selectColumns = columns ?? '*';
    this.selectOpts = options ?? {};
    return this;
  }

  insert(data: any): this {
    this.insertPayload = data;
    return this;
  }

  upsert(data: any): this {
    this.insertPayload = data;
    this.isUpsert = true;
    return this;
  }

  update(data: any): this {
    this.updatePayload = data;
    return this;
  }

  delete(): this {
    this.isDelete = true;
    return this;
  }

  eq(column: string, value: any): this {
    this.filters.push({ column, value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): this {
    this.orderClause = { column, ascending: options?.ascending ?? true };
    return this;
  }

  limit(n: number): this {
    this.limitVal = n;
    return this;
  }

  single(): Promise<any> {
    this.singleMode = 'single';
    return this.execute();
  }

  maybeSingle(): Promise<any> {
    this.singleMode = 'maybeSingle';
    return this.execute();
  }

  then(resolve: (v: any) => any, reject?: (r?: any) => any): Promise<any> {
    return this.execute().then(resolve, reject);
  }

  private async execute(): Promise<any> {
    const db = loadDB();
    const rows = (db as any)[this.table] as Row[];

    if (this.isDelete) {
      const toDelete = this.filterRows(rows);
      if (this.table === 'events') {
        const eventIds = toDelete.map((r) => r.id);
        db.comments = db.comments.filter((c) => !eventIds.includes(c.event_id));
        db.event_reactions = db.event_reactions.filter((r) => !eventIds.includes(r.event_id));
        db.reports = db.reports.filter((r) => !eventIds.includes(r.event_id));
      }
      (db as any)[this.table] = rows.filter((r) => !toDelete.includes(r));
      saveDB(db);
      emitChange(this.table);
      return { data: null, error: null };
    }

    if (this.insertPayload) {
      if (this.isUpsert) {
        const pk = this.insertPayload.id;
        const idx = rows.findIndex((r) => r.id === pk);
        if (idx >= 0) {
          rows[idx] = { ...rows[idx], ...this.insertPayload };
        } else {
          rows.push({ ...this.insertPayload });
        }
      } else {
        const newRow = { ...this.insertPayload };
        if (this.table === 'events' && typeof newRow.location === 'string') {
          const m = newRow.location.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/);
          if (m) {
            newRow._lng = parseFloat(m[1]);
            newRow._lat = parseFloat(m[2]);
          }
        }
        if (!newRow.id) newRow.id = genId();
        if (!newRow.created_at) newRow.created_at = new Date().toISOString();
        rows.push(newRow);
      }
      saveDB(db);
      emitChange(this.table);

      if (this.selectColumns) {
        const inserted = rows[rows.length - 1];
        if (this.singleMode) return { data: this.project(inserted), error: null };
        return { data: [this.project(inserted)], error: null };
      }
      return { data: null, error: null };
    }

    if (this.updatePayload) {
      const toUpdate = this.filterRows(rows);
      for (const row of toUpdate) Object.assign(row, this.updatePayload);
      saveDB(db);
      emitChange(this.table);
      return { data: null, error: null };
    }

    let result = this.filterRows(rows);
    if (this.orderClause) {
      result = [...result].sort((a, b) => {
        const av = a[this.orderClause!.column];
        const bv = b[this.orderClause!.column];
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        return this.orderClause!.ascending ? cmp : -cmp;
      });
    }
    if (this.limitVal !== null) result = result.slice(0, this.limitVal);

    if (this.selectOpts.head) return { count: result.length, data: null, error: null };

    if (this.selectColumns && this.selectColumns.includes('profiles!')) {
      result = result.map((r) => {
        const profile = db.profiles.find((p) => p.id === r.user_id);
        return {
          ...this.project(r),
          profiles: profile
            ? { username: profile.username, avatar_url: profile.avatar_url }
            : { username: 'Anonimo', avatar_url: null },
        };
      });
    } else {
      result = result.map((r) => this.project(r));
    }

    if (this.singleMode === 'single') {
      return { data: result[0] ?? null, error: result[0] ? null : { message: 'No rows' } };
    }
    if (this.singleMode === 'maybeSingle') return { data: result[0] ?? null, error: null };
    return { data: result, error: null };
  }

  private filterRows(rows: Row[]): Row[] {
    return rows.filter((r) => {
      for (const f of this.filters) {
        if (r[f.column] !== f.value) return false;
      }
      return true;
    });
  }

  private project(row: Row): Row {
    const { _lat, _lng, ...rest } = row;
    return rest;
  }
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function rpc(name: string, params: any): Promise<{ data: any; error: any }> {
  if (name !== 'vibe_nearby_events') return { data: null, error: { message: `Unknown RPC: ${name}` } };

  const db = loadDB();
  const { p_lat, p_lng, p_radius_m } = params;
  const now = Date.now();

  const nearby = db.events
    .filter((e) => !e.hidden && new Date(e.end_time).getTime() > now)
    .map((e) => ({ e, dist: haversine(p_lat, p_lng, e._lat, e._lng) }))
    .filter((x) => x.dist <= p_radius_m)
    .sort((a, b) => a.dist - b.dist);

  const data = nearby.map(({ e, dist }) => {
    const profile = db.profiles.find((p) => p.id === e.creator_id);
    return {
      id: e.id,
      creator_id: e.creator_id,
      title: e.title,
      description: e.description,
      category: e.category,
      address_text: e.address_text,
      start_time: e.start_time,
      end_time: e.end_time,
      lat: e._lat,
      lng: e._lng,
      creator_username: profile?.username ?? 'Anonimo',
      going_count: db.event_reactions.filter((r) => r.event_id === e.id && r.status === 'going').length,
      not_going_count: db.event_reactions.filter((r) => r.event_id === e.id && r.status === 'not_going').length,
      liked_count: db.event_reactions.filter((r) => r.event_id === e.id && r.status === 'liked').length,
      distance_m: dist,
    };
  });

  return { data, error: null };
}

export const mockSupabase = {
  from: (table: string) => new MockQueryBuilder(table),
  rpc,
  channel: (name: string) => new MockChannel(name),
  removeChannel: (ch: MockChannel) => ch.unsubscribe(),
  auth: {
    async getSession() {
      return { data: { session: null }, error: null };
    },
    onAuthStateChange(_cb: any) {
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
    async signOut() {
      return { error: null };
    },
  },
  storage: {
    from(_bucket: string) {
      return {
        async upload() {
          return { error: null };
        },
        getPublicUrl(path: string) {
          return { data: { publicUrl: `mock://event-photos/${path}` } };
        },
        async remove() {
          return { error: null };
        },
      };
    },
  },
  functions: {
    async invoke() {
      return { data: { unsafe: false }, error: null };
    },
  },
};
