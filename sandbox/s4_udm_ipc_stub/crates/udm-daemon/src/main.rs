use std::io;
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::windows::named_pipe::{NamedPipeServer, ServerOptions};
use udm_proto::{ClientMessage, ServerMessage, WireEnvelope, DEFAULT_PIPE_NAME};

fn current_timestamp_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

fn handle_message(envelope: WireEnvelope<ClientMessage>) -> WireEnvelope<ServerMessage> {
    let now = current_timestamp_ms();
    let reply = match envelope.message {
        ClientMessage::Ping {
            seq,
            client_timestamp_ms,
        } => ServerMessage::Pong {
            seq,
            client_timestamp_ms,
            server_timestamp_ms: now,
        },
        ClientMessage::Enqueue {
            url: _,
            filename,
            headers: _,
        } => {
            let name = filename.unwrap_or_else(|| "download.bin".to_string());
            ServerMessage::Enqueued {
                id: format!("dl_{seq}", seq = now),
                target_path: format!("C:\\Downloads\\{name}"),
            }
        }
        ClientMessage::RenewResponse {
            id,
            new_url: _,
            headers: _,
        } => ServerMessage::Enqueued {
            id,
            target_path: "resumed".to_string(),
        },
    };
    WireEnvelope::new(reply)
}

async fn serve_client(mut server: NamedPipeServer) -> io::Result<()> {
    let mut len_buf = [0u8; 4];
    server.read_exact(&mut len_buf).await?;
    let length = u32::from_le_bytes(len_buf) as usize;

    let mut payload = vec![0u8; length];
    server.read_exact(&mut payload).await?;

    let envelope: WireEnvelope<ClientMessage> = match serde_json::from_slice(&payload) {
        Ok(msg) => msg,
        Err(e) => {
            let err_reply = WireEnvelope::new(ServerMessage::Error {
                code: 400,
                message: format!("Malformed JSON: {e}"),
            });
            let serialized = serde_json::to_vec(&err_reply).map_err(|se| {
                io::Error::new(io::ErrorKind::Other, format!("Serialization error: {se}"))
            })?;
            let resp_len = serialized.len() as u32;
            server.write_all(&resp_len.to_le_bytes()).await?;
            server.write_all(&serialized).await?;
            server.flush().await?;
            return Ok(());
        }
    };

    let reply = handle_message(envelope);
    let serialized = serde_json::to_vec(&reply).map_err(|se| {
        io::Error::new(io::ErrorKind::Other, format!("Serialization error: {se}"))
    })?;

    let resp_len = serialized.len() as u32;
    server.write_all(&resp_len.to_le_bytes()).await?;
    server.write_all(&serialized).await?;
    server.flush().await?;
    Ok(())
}

#[tokio::main]
async fn main() -> io::Result<()> {
    println!("[crush-udm-daemon] Listening on named pipe: {DEFAULT_PIPE_NAME}");
    let mut is_first = true;

    loop {
        let server = ServerOptions::new()
            .first_pipe_instance(is_first)
            .create(DEFAULT_PIPE_NAME)?;
        is_first = false;

        server.connect().await?;
        tokio::spawn(async move {
            if let Err(e) = serve_client(server).await {
                eprintln!("[crush-udm-daemon] client handler error: {e}");
            }
        });
    }
}
