// supabase/functions/send-notification/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Manejar preflight de CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { record } = await req.json() // Supabase Webhooks envían el registro en 'record'
    
    // 1. Inicializar cliente Supabase con Service Role (para saltar RLS)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log(`🚀 Procesando notificación ID: ${record.id} de tipo: ${record.type}`)

    // 2. Lógica de envío (Ejemplo: Resend para Email o Twilio para WhatsApp)
    // En este ejemplo, simularemos una llamada a un servicio externo
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`
      },
      body: JSON.stringify({
        from: 'Taller <notificaciones@tu-dominio.com>',
        to: [record.payload.email || 'cliente@ejemplo.com'],
        subject: record.title,
        html: `<strong>${record.body}</strong>`
      })
    })

    if (!response.ok) throw new Error(`Error en el servicio de envío: ${await response.text()}`)

    // 3. Marcar como enviada en la base de datos
    const { error: updateError } = await supabase
      .from('scheduled_notifications')
      .update({ 
        status: 'sent', 
        sent_at: new Date().toISOString() 
      })
      .eq('id', record.id)

    if (updateError) throw updateError

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Error enviando notificación:', error.message)
    
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
