use serde::{Deserialize, Serialize};

pub const PROTOCOL_VERSION: u32 = 1;
pub const DEFAULT_PIPE_NAME: &str = r"\\.\pipe\crush-udm-s4";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "type", content = "payload")]
pub enum ClientMessage {
    Ping {
        seq: u64,
        client_timestamp_ms: u64,
    },
    Enqueue {
        url: String,
        filename: Option<String>,
        headers: Vec<(String, String)>,
    },
    RenewResponse {
        id: String,
        new_url: String,
        headers: Vec<(String, String)>,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "type", content = "payload")]
pub enum ServerMessage {
    Pong {
        seq: u64,
        client_timestamp_ms: u64,
        server_timestamp_ms: u64,
    },
    Enqueued {
        id: String,
        target_path: String,
    },
    RenewRequest {
        id: String,
        origin_page_url: String,
        resume_offset: u64,
        expected_overlap_sha256: String,
    },
    Error {
        code: u32,
        message: String,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct WireEnvelope<T> {
    pub version: u32,
    pub message: T,
}

impl<T> WireEnvelope<T> {
    pub fn new(message: T) -> Self {
        Self {
            version: PROTOCOL_VERSION,
            message,
        }
    }
}
