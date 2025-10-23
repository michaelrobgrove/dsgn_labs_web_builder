// /functions/download/[file].js

export async function onRequestGet(context) {
    try {
        const { params, env } = context;
        const fileName = params.file;

        // Retrieve file from R2
        const object = await env.WEBSITE_FILES.get(fileName);

        if (!object) {
            return new Response('File not found', { status: 404 });
        }

        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set('Content-Disposition', `attachment; filename="${fileName}"`);

        return new Response(object.body, { headers });

    } catch (error) {
        return new Response(`Download error: ${error.message}`, { status: 500 });
    }
}
