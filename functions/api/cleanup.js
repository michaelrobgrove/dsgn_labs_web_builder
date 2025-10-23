// /functions/api/cleanup.js
// This runs daily to delete expired downloads (3 days old)

export async function onRequest(context) {
    try {
        const { env } = context;
        const now = Date.now();
        let deletedCount = 0;

        // List all files in R2
        const listed = await env.WEBSITE_FILES.list();
        
        for (const object of listed.objects) {
            // Get file metadata
            const file = await env.WEBSITE_FILES.get(object.key);
            
            if (file && file.customMetadata && file.customMetadata.expiresAt) {
                const expiresAt = parseInt(file.customMetadata.expiresAt);
                
                // If expired, delete it
                if (now > expiresAt) {
                    await env.WEBSITE_FILES.delete(object.key);
                    deletedCount++;
                    console.log(`Deleted expired file: ${object.key}`);
                }
            }
        }

        return new Response(JSON.stringify({
            success: true,
            deletedCount,
            message: `Cleanup complete. Deleted ${deletedCount} expired file(s).`
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Cleanup error:', error);
        return new Response(JSON.stringify({
            error: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}