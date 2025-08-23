import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { productId, buyerEmail } = await req.json();

    // Verify the user has purchased this product
    const { data: download } = await supabaseClient
      .from('downloads')
      .select('*, products(*)')
      .eq('product_id', productId)
      .eq('buyer_email', buyerEmail)
      .single();

    if (!download) {
      return new Response(
        JSON.stringify({ error: 'Download not authorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Generate signed URL for download (expires in 1 hour)
    const { data: signedUrl } = await supabaseClient.storage
      .from('product-files')
      .createSignedUrl(download.products.file_url, 3600);

    if (!signedUrl) {
      throw new Error('Failed to generate download link');
    }

    // Update download count
    await supabaseClient
      .from('downloads')
      .update({ download_count: download.download_count + 1 })
      .eq('id', download.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        downloadUrl: signedUrl.signedUrl,
        productName: download.products.title
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Download link generation error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});