use std::fs::OpenOptions;
use std::io::{self, Read, Write};
use udm_proto::DEFAULT_PIPE_NAME;

const MAX_MESSAGE_SIZE: usize = 1024 * 1024; // 1 MiB limit for safety

fn read_length_prefixed(reader: &mut impl Read) -> io::Result<Option<Vec<u8>>> {
    let mut len_buf = [0u8; 4];
    match reader.read_exact(&mut len_buf) {
        Ok(()) => {}
        Err(e) if e.kind() == io::ErrorKind::UnexpectedEof => return Ok(None),
        Err(e) => return Err(e),
    }

    let length = u32::from_le_bytes(len_buf) as usize;
    if length > MAX_MESSAGE_SIZE {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            format!("Message size {length} exceeds maximum limit {MAX_MESSAGE_SIZE}"),
        ));
    }

    let mut payload = vec![0u8; length];
    reader.read_exact(&mut payload)?;
    Ok(Some(payload))
}

fn write_length_prefixed(writer: &mut impl Write, payload: &[u8]) -> io::Result<()> {
    let length = payload.len() as u32;
    writer.write_all(&length.to_le_bytes())?;
    writer.write_all(payload)?;
    writer.flush()?;
    Ok(())
}

fn forward_to_pipe(payload: &[u8]) -> io::Result<Vec<u8>> {
    let mut pipe = OpenOptions::new()
        .read(true)
        .write(true)
        .open(DEFAULT_PIPE_NAME)?;

    write_length_prefixed(&mut pipe, payload)?;

    match read_length_prefixed(&mut pipe)? {
        Some(response) => Ok(response),
        None => Err(io::Error::new(
            io::ErrorKind::UnexpectedEof,
            "Daemon closed pipe connection unexpectedly",
        )),
    }
}

fn run_bridge_loop() -> io::Result<()> {
    let stdin = io::stdin();
    let mut stdin_lock = stdin.lock();
    let stdout = io::stdout();
    let mut stdout_lock = stdout.lock();

    while let Some(request) = read_length_prefixed(&mut stdin_lock)? {
        let response = match forward_to_pipe(&request) {
            Ok(resp) => resp,
            Err(e) => {
                let err_msg = udm_proto::WireEnvelope::new(udm_proto::ServerMessage::Error {
                    code: 500,
                    message: format!("Bridge IPC failure: {e}"),
                });
                serde_json::to_vec(&err_msg).map_err(|se| {
                    io::Error::new(io::ErrorKind::Other, format!("JSON serialization error: {se}"))
                })?
            }
        };

        write_length_prefixed(&mut stdout_lock, &response)?;
    }

    Ok(())
}

fn main() {
    if let Err(e) = run_bridge_loop() {
        eprintln!("[crush-udm-bridge] fatal error: {e}");
        std::process::exit(1);
    }
}
