// Cloudflare Pages Function - API Endpoint for Adoracao
function getDefaultSlots() {
  return [
    { time: "05:00", adorers: [{ name: "Rosário" }], notes: "" },
    { time: "06:00", adorers: [{ name: "Rosário" }], notes: "" },
    { time: "07:00", adorers: [], notes: "" },
    { time: "08:00", adorers: [], notes: "" },
    { time: "09:00", adorers: [], notes: "" },
    { time: "10:00", adorers: [], notes: "" },
    { time: "11:00", adorers: [], notes: "" },
    { time: "12:00", adorers: [], notes: "" },
    { time: "13:00", adorers: [], notes: "" },
    { time: "14:00", adorers: [], notes: "" },
    { time: "15:00", adorers: [], notes: "" },
    { time: "16:00", adorers: [], notes: "" },
    { time: "17:00", adorers: [], notes: "" },
    { time: "18:00", adorers: [], notes: "" },
    { time: "19:00", adorers: [{ name: "Encerramento" }], notes: "Missa / Encerramento" }
  ];
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json; charset=utf-8'
};

const memoryStore = new Map();

export async function onRequest(context) {
  const { request, env } = context;
  const kv = env.ADORACAO_KV || env.KV;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const url = new URL(request.url);

  async function getData(dateStr) {
    const key = `adoracao_${dateStr}`;
    let data = null;

    if (kv) {
      try {
        const val = await kv.get(key);
        if (val) data = JSON.parse(val);
      } catch (e) {
        console.error('KV Read Error:', e);
      }
    } else {
      data = memoryStore.get(key);
    }

    if (!data) {
      data = {
        date: dateStr,
        title: "Quinta-feira de Adoração",
        community: "Comunidade do Formoso",
        slots: getDefaultSlots(),
        last_updated: new Date().toISOString()
      };
      await saveData(dateStr, data);
    }

    return data;
  }

  async function saveData(dateStr, data) {
    const key = `adoracao_${dateStr}`;
    data.last_updated = new Date().toISOString();
    const jsonStr = JSON.stringify(data);

    if (kv) {
      try {
        await kv.put(key, jsonStr);
      } catch (e) {
        console.error('KV Write Error:', e);
      }
    }
    memoryStore.set(key, data);
  }

  if (request.method === 'GET') {
    const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
    const data = await getData(date);
    return new Response(JSON.stringify({ status: 'success', data }), { headers: CORS_HEADERS });
  }

  if (request.method === 'POST') {
    let body = {};
    try {
      body = await request.json();
    } catch (e) {
      // empty body
    }

    const action = body.action || '';
    const date = body.date || new Date().toISOString().split('T')[0];

    let data = await getData(date);

    if (action === 'book') {
      const { time, name, intention } = body;
      if (!name || !time) {
        return new Response(JSON.stringify({ status: 'error', message: 'Nome e horário são obrigatórios.' }), { headers: CORS_HEADERS });
      }

      let updated = false;
      for (let slot of data.slots) {
        if (slot.time === time) {
          if (!slot.adorers) slot.adorers = [];
          slot.adorers.push({
            name: name.trim(),
            intention: intention ? intention.trim() : '',
            created_at: new Date().toISOString()
          });
          updated = true;
          break;
        }
      }

      if (updated) {
        await saveData(date, data);
        return new Response(JSON.stringify({ status: 'success', message: 'Horário agendado com sucesso!', data }), { headers: CORS_HEADERS });
      } else {
        return new Response(JSON.stringify({ status: 'error', message: 'Horário não encontrado.' }), { headers: CORS_HEADERS });
      }
    }

    if (action === 'remove') {
      const { time, index } = body;
      const idx = parseInt(index, 10) || 0;

      for (let slot of data.slots) {
        if (slot.time === time) {
          if (slot.adorers && slot.adorers[idx]) {
            slot.adorers.splice(idx, 1);
            break;
          }
        }
      }

      await saveData(date, data);
      return new Response(JSON.stringify({ status: 'success', message: 'Adorador removido com sucesso!', data }), { headers: CORS_HEADERS });
    }

    if (action === 'reset_day') {
      data.slots = getDefaultSlots();
      await saveData(date, data);
      return new Response(JSON.stringify({ status: 'success', message: 'Horários reiniciados para o padrão!', data }), { headers: CORS_HEADERS });
    }

    if (action === 'save_all') {
      if (Array.isArray(body.slots)) {
        data.slots = body.slots;
        await saveData(date, data);
        return new Response(JSON.stringify({ status: 'success', message: 'Escala salva com sucesso!', data }), { headers: CORS_HEADERS });
      }
      return new Response(JSON.stringify({ status: 'error', message: 'Dados inválidos.' }), { headers: CORS_HEADERS });
    }

    return new Response(JSON.stringify({ status: 'error', message: 'Ação desconhecida.' }), { headers: CORS_HEADERS });
  }

  return new Response(JSON.stringify({ status: 'error', message: 'Método não suportado' }), { status: 405, headers: CORS_HEADERS });
}
