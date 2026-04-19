use tauri::{AppHandle, Emitter, Manager, State};
use notify::{Watcher, RecommendedWatcher, RecursiveMode, Config, Event, EventKind};
use std::fs;
use std::path::{PathBuf, Path};
use std::sync::Mutex;

struct VaultState {
    watcher: Mutex<Option<RecommendedWatcher>>,
}

fn setup_category_structure(base_path: &Path) -> Result<(), String> {
    fs::create_dir_all(base_path.join("notes")).map_err(|e| e.to_string())?;
    fs::create_dir_all(base_path.join("attachments")).map_err(|e| e.to_string())?;
    Ok(())
}

// Optimized Janitor: Only moves files that are DIRECTLY in the root
fn organize_root_files(vault_path: &Path) -> Result<bool, String> {
    let mut moved_anything = false;
    let uncategorized_path = vault_path.join("Uncategorized");
    setup_category_structure(&uncategorized_path)?;

    if let Ok(entries) = fs::read_dir(vault_path) {
        for entry in entries.flatten() {
            let path = entry.path();
            // Skip if it's a directory or a hidden file
            if path.is_dir() || path.file_name().unwrap().to_string_lossy().starts_with('.') {
                continue;
            }

            let name = entry.file_name();
            let name_str = name.to_string_lossy().to_lowercase();
            let target_sub = if name_str.ends_with(".md") { "notes" } else { "attachments" };
            
            let dest = uncategorized_path.join(target_sub).join(name);
            if fs::rename(&path, dest).is_ok() {
                moved_anything = true;
            }
        }
    }
    Ok(moved_anything)
}

#[tauri::command]
fn get_files(vault_path: String, category: String, subfolder: String) -> Result<Vec<String>, String> {
    let target_path = PathBuf::from(&vault_path).join(&category).join(&subfolder);
    let mut files = Vec::new();

    if let Ok(entries) = fs::read_dir(target_path) {
        for entry in entries.flatten() {
            if entry.path().is_file() {
                files.push(entry.file_name().to_string_lossy().to_string());
            }
        }
    }
    Ok(files)
}

#[tauri::command]
fn get_categories(vault_path: String) -> Result<Vec<String>, String> {
    let path = PathBuf::from(&vault_path);
    let mut categories = Vec::new();

    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.is_dir() {
                let name = entry.file_name().to_string_lossy().to_string();
                if !name.starts_with('.') && p.join("notes").exists() {
                    categories.push(name);
                }
            }
        }
    }
    Ok(categories)
}

#[tauri::command]
fn create_category(vault_path: String, category_name: String) -> Result<(), String> {
    setup_category_structure(&PathBuf::from(&vault_path).join(&category_name))
}

#[tauri::command]
fn get_default_vault(app: AppHandle, state: State<'_, VaultState>) -> Result<String, String> {
    let doc_dir = app.path().document_dir().map_err(|e| e.to_string())?;
    let mnemo_path = doc_dir.join("mnemo");
    fs::create_dir_all(&mnemo_path).map_err(|e| e.to_string())?;

    let path_str = mnemo_path.to_string_lossy().to_string();
    let _ = organize_root_files(&mnemo_path);

    let handle = app.clone();
    let root_path = mnemo_path.clone();
    
    let mut watcher = RecommendedWatcher::new(
        move |res: notify::Result<Event>| {
            if let Ok(event) = res {
                // Only trigger if a file was created or moved into the root
                if matches!(event.kind, EventKind::Create(_) | EventKind::Modify(_)) {
                    let _ = organize_root_files(&root_path);
                    let _ = handle.emit("vault-changed", ());
                }
            }
        },
        Config::default(),
    ).map_err(|e| e.to_string())?;

    watcher.watch(&mnemo_path, RecursiveMode::Recursive).map_err(|e| e.to_string())?;
    *state.watcher.lock().unwrap() = Some(watcher);

    Ok(path_str)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(VaultState { watcher: Mutex::new(None) })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            get_default_vault, create_category, get_categories, get_files
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}