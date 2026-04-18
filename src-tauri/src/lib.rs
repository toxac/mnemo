use tauri::Manager;
use std::fs;
use std::path::PathBuf;

#[tauri::command]
fn create_category(vault_path: String, category_name: String) -> Result<(), String> {
    let base_path = PathBuf::from(&vault_path).join(&category_name);
    
    // Create the dual-folder structure
    let notes_path = base_path.join("notes");
    let attachments_path = base_path.join("attachments");

    fs::create_dir_all(notes_path).map_err(|e| e.to_string())?;
    fs::create_dir_all(attachments_path).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn get_default_vault(app: tauri::AppHandle) -> Result<String, String> {
    // Finds /home/user/Documents/mnemo on Linux
    let doc_dir = app.path().document_dir()
        .map_err(|e| e.to_string())?;
    
    let mnemo_path = doc_dir.join("mnemo");

    if !mnemo_path.exists() {
        std::fs::create_dir_all(&mnemo_path).map_err(|e| e.to_string())?;
    }

    Ok(mnemo_path.to_string_lossy().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        // Just one dot here!
        .invoke_handler(tauri::generate_handler![
            get_default_vault, 
            create_category
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
