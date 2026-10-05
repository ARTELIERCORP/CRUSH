use std::io::{Read, Write};
use std::process::{Child, Command, Stdio};
use std::thread::sleep;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use udm_proto::{ClientMessage, ServerMessage, WireEnvelope};

struct ProcessGuard(Option<Child>);

impl Drop for ProcessGuard {
    fn drop(&mut self) {
        if let Some(mut child) = self.0.take() {
            let _ = child.kill();
            let _ = child.wait();
        }
    }
}

#[test]
fn test_bridge_daemon_ping_pong_roundtrip() {
    let test_exe = std::env::current_exe().expect("Failed to get current_exe");
    let target_dir = test_exe
        .parent()
        .expect("no deps dir")
        .parent()
        .expect("no target dir");

    let daemon_exe = target_dir.join("udm-daemon.exe");
    let bridge_exe = target_dir.join("udm-bridge.exe");

    // Spawn daemon in background
    let daemon_proc = Command::new(daemon_exe)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .expect("Failed to spawn udm-daemon");
    let _daemon_guard = ProcessGuard(Some(daemon_proc));

    // Wait 250ms for named pipe instantiation
    sleep(Duration::from_millis(250));

    // Spawn bridge with piped stdio
    let mut bridge_proc = Command::new(bridge_exe)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::inherit())
        .spawn()
        .expect("Failed to spawn udm-bridge");

    let mut stdin = bridge_proc.stdin.take().expect("Failed to open bridge stdin");
    let mut stdout = bridge_proc.stdout.take().expect("Failed to open bridge stdout");
    let _bridge_guard = ProcessGuard(Some(bridge_proc));

    let now_ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis() as u64;

    let ping = WireEnvelope::new(ClientMessage::Ping {
        seq: 42,
        client_timestamp_ms: now_ms,
    });

    let json_bytes = serde_json::to_vec(&ping).expect("JSON serialize failed");
    let length = json_bytes.len() as u32;

    let start_instant = Instant::now();

    // Write 4-byte LE length + JSON
    stdin.write_all(&length.to_le_bytes()).unwrap();
    stdin.write_all(&json_bytes).unwrap();
    stdin.flush().unwrap();

    // Read 4-byte LE length response
    let mut resp_len_buf = [0u8; 4];
    stdout.read_exact(&mut resp_len_buf).unwrap();
    let resp_len = u32::from_le_bytes(resp_len_buf) as usize;

    let mut resp_bytes = vec![0u8; resp_len];
    stdout.read_exact(&mut resp_bytes).unwrap();

    let round_trip_duration = start_instant.elapsed();

    let resp_envelope: WireEnvelope<ServerMessage> =
        serde_json::from_slice(&resp_bytes).expect("JSON parse failed");

    match resp_envelope.message {
        ServerMessage::Pong {
            seq,
            client_timestamp_ms,
            server_timestamp_ms,
        } => {
            assert_eq!(seq, 42);
            assert_eq!(client_timestamp_ms, now_ms);
            assert!(server_timestamp_ms >= client_timestamp_ms);
            println!(
                "[Spike S4 Measured] Native messaging roundtrip IPC elapsed: {:?}",
                round_trip_duration
            );
        }
        other => panic!("Unexpected response from daemon: {:?}", other),
    }
}
