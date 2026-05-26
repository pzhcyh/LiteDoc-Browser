use rfd::FileDialog;
use serde::Serialize;
use std::{env, fs, path::Path};
use url::Url;

#[derive(Serialize)]
struct FileDocument {
    path: String,
    name: String,
    extension: String,
    content: String,
    base_url: String,
}

fn read_document(path: &Path) -> Result<FileDocument, String> {
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_lowercase();

    if !matches!(extension.as_str(), "html" | "htm" | "md" | "markdown") {
        return Err("Only HTML and Markdown files are supported.".to_string());
    }

    let content = fs::read_to_string(path).map_err(|error| error.to_string())?;
    let name = path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("Untitled")
        .to_string();
    let base_url = path
        .parent()
        .and_then(|parent| Url::from_directory_path(parent).ok())
        .map(|url| url.to_string())
        .unwrap_or_default();

    Ok(FileDocument {
        path: path.to_string_lossy().to_string(),
        name,
        extension,
        content,
        base_url,
    })
}

#[tauri::command]
fn open_file_dialog() -> Result<Option<FileDocument>, String> {
    let file = FileDialog::new()
        .add_filter("Documents", &["html", "htm", "md", "markdown"])
        .pick_file();

    match file {
        Some(path) => read_document(&path).map(Some),
        None => Ok(None),
    }
}

#[tauri::command]
fn open_startup_file() -> Result<Option<FileDocument>, String> {
    let args = env::args().collect::<Vec<_>>();
    let path = args.iter().skip(1).find(|arg| Path::new(arg).is_file());

    match path {
        Some(path) => read_document(Path::new(path)).map(Some),
        None => Ok(None),
    }
}

#[tauri::command]
fn save_file(path: String, content: String) -> Result<(), String> {
    fs::write(path, content).map_err(|error| error.to_string())
}

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            open_file_dialog,
            open_startup_file,
            save_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running LiteDoc Browser");
}

fn main() {
    run();
}
