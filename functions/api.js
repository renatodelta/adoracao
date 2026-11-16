// Cloudflare Pages Function - API Endpoint for Adoracao & Vigília de Cristo Rei
function getVigiliaSlots() {
  return [
    { time: "Sáb 17:00", adorers: [], notes: "Abertura da Vigília de Cristo Rei" },
    { time: "Sáb 18:00", adorers: [], notes: "" },
    { time: "Sáb 19:00", adorers: [], notes: "" },
    { time: "Sáb 20:00", adorers: [], notes: "" },
    { time: "Sáb 21:00", adorers: [], notes: "" },
    { time: "Sáb 22:00", adorers: [], notes: "" },
    { time: "Sáb 23:00", adorers: [], notes: "" },
    { time: "Dom 00:00", adorers: [], notes: "Madrugada" },
    { time: "Dom 01:00", adorers: [], notes: "Madrugada" },
    { time: "Dom 02:00", adorers: [], notes: "Madrugada" },
    { time: "Dom 03:00", adorers: [], notes: "Madrugada" },
    { time: "Dom 04:00", adorers: [], notes: "Madrugada" },
    { time: "Dom 05:00", adorers: [], notes: "" },
    { time: "Dom 06:00", adorers: [], notes: "" },
    { time: "Dom 07:00", adorers: [], notes: "" },
    { time: "Dom 08:00", adorers: [], notes: "" },
    { time: "Dom 09:00", adorers: [], notes: "" },
    { time: "Dom 10:00", adorers: [], notes: "" },
    { time: "Dom 11:00", adorers: [], notes: "" },
    { time: "Dom 12:00", adorers: [], notes: "" },
    { time: "Dom 13:00", adorers: [], notes: "" },
    { time: "Dom 14:00", adorers: [], notes: "" },
    { time: "Dom 15:00", adorers: [], notes: "" },
    { time: "Dom 16:00", adorers: [], notes: "" },
    { time: "Dom 17:00", adorers: [{ name: "Santa Missa de Cristo Rei" }], notes: "Missa / Encerramento" }
  ];
}

function getCercoJericoSlots() {
  const slots = [];
  for (let h = 0; h < 24; h++) {
    const time = `${String(h).padStart(2, '0')}:00`;
    const notes = h < 6 ? "Madrugada" : "";
    slots.push({ time, adorers: [], notes });
  }
  return slots;
}

function getDefaultSlots(type = 'adoracao') {
  if (type === 'vigilia') {
    return getVigiliaSlots();
  }
  if (type === 'sjb') {
    return getCercoJericoSlots();
  }
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

  async function getData(dateStr, type = 'adoracao') {
    const isVigilia = type === 'vigilia';
    const isSjb = type === 'sjb';
    const key = isVigilia ? `vigilia_cristo_rei_${dateStr}` : (isSjb ? `cerco_sjb_${dateStr}` : `adoracao_${dateStr}`);
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

    const defaultQuoteText = isVigilia
      ? "O Senhor é Rei, revestiu-se de majestade. Vinde, adoremos a Cristo, Rei do Universo, no Santíssimo Sacramento!"
      : (isSjb
        ? "“Eu e minha casa serviremos ao Senhor.” (Js 24,15) — “Buscai o Senhor enquanto Ele se deixa encontrar.” (Is 55,6)"
        : "Se desejas progredir na vida espiritual, aproxima-te frequentemente da Eucaristia.");
    const defaultQuoteAuthor = isVigilia
      ? "Nosso Senhor Jesus Cristo, Rei do Universo · Encerramento do Ano Litúrgico"
      : (isSjb ? "Cerco de Jericó · 15 a 22 de Novembro · Paróquia São José" : "São Boaventura");

    if (!data) {
      data = {
        date: dateStr,
        title: isVigilia ? "Vigília de Cristo Rei — 24 Horas" : (isSjb ? "Cerco de Jericó — Adoração Dia e Noite" : "Quinta-feira de Adoração"),
        community: isSjb ? "Paróquia São José — São José do Barreiro" : "Comunidade do Formoso",
        quote_text: defaultQuoteText,
        quote_author: defaultQuoteAuthor,
        slots: getDefaultSlots(type),
        last_updated: new Date().toISOString()
      };
      await saveData(dateStr, data, type);
    } else {
      if (!data.quote_text) {
        data.quote_text = defaultQuoteText;
        data.quote_author = defaultQuoteAuthor;
      }
    }

    return data;
  }

  async function saveData(dateStr, data, type = 'adoracao') {
    const key = type === 'vigilia' ? `vigilia_cristo_rei_${dateStr}` : (type === 'sjb' ? `cerco_sjb_${dateStr}` : `adoracao_${dateStr}`);
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
    const type = url.searchParams.get('type') || 'adoracao';
    const date = url.searchParams.get('date') || (type === 'vigilia' ? '2026-11-21' : new Date().toISOString().split('T')[0]);
    const data = await getData(date, type);
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
    const type = body.type || url.searchParams.get('type') || 'adoracao';
    const date = body.date || (type === 'vigilia' ? '2026-11-21' : new Date().toISOString().split('T')[0]);

    let data = await getData(date, type);

    if (action === 'save_quote') {
      data.quote_text = (body.quote_text || "").trim();
      data.quote_author = (body.quote_author || "").trim();
      await saveData(date, data, type);
      return new Response(JSON.stringify({ status: 'success', message: 'Frase atualizada com sucesso!', data }), { headers: CORS_HEADERS });
    }

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
        await saveData(date, data, type);
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

      await saveData(date, data, type);
      return new Response(JSON.stringify({ status: 'success', message: 'Adorador removido com sucesso!', data }), { headers: CORS_HEADERS });
    }

    if (action === 'reset_day') {
      data.slots = getDefaultSlots(type);
      await saveData(date, data, type);
      return new Response(JSON.stringify({ status: 'success', message: 'Horários reiniciados para o padrão!', data }), { headers: CORS_HEADERS });
    }

    if (action === 'add_general_intention') {
      const name = (body.name || "Anônimo").trim();
      const intention = (body.intention || "").trim();

      if (!intention) {
        return new Response(JSON.stringify({ status: 'error', message: 'O pedido de oração não pode estar vazio.' }), { headers: CORS_HEADERS });
      }

      if (!Array.isArray(data.general_intentions)) {
        data.general_intentions = [];
      }

      data.general_intentions.push({
        name: name || "Anônimo",
        intention: intention,
        created_at: new Date().toISOString()
      });

      await saveData(date, data, type);
      return new Response(JSON.stringify({ status: 'success', message: 'Pedido de oração adicionado com sucesso!', data }), { headers: CORS_HEADERS });
    }

    if (action === 'save_all') {
      if (Array.isArray(body.slots)) {
        data.slots = body.slots;
        await saveData(date, data, type);
        return new Response(JSON.stringify({ status: 'success', message: 'Escala salva com sucesso!', data }), { headers: CORS_HEADERS });
      }
    }

    if (action === 'upload_custodia') {
      const imgData = body.image_data;
      const fitMode = body.fit_mode || 'contain';
      if (kv && imgData) {
        await kv.put('custodia_image_custom', imgData);
        await kv.put('custodia_fit_mode', fitMode);
      }
      return new Response(JSON.stringify({
        status: 'success',
        message: 'Foto da Custódia atualizada com sucesso!',
        custodia_fit: fitMode,
        custodia_version: Date.now()
      }), { headers: CORS_HEADERS });
    }

    if (action === 'reset_custodia') {
      if (kv) {
        await kv.delete('custodia_image_custom');
        await kv.delete('custodia_fit_mode');
      }
      return new Response(JSON.stringify({
        status: 'success',
        message: 'Foto original da Custódia restaurada com sucesso!',
        custodia_fit: 'contain',
        custodia_version: Date.now()
      }), { headers: CORS_HEADERS });
    }

    return new Response(JSON.stringify({ status: 'error', message: 'Ação desconhecida.' }), { headers: CORS_HEADERS });
  }

  return new Response(JSON.stringify({ status: 'error', message: 'Método não suportado' }), { status: 405, headers: CORS_HEADERS });
}
