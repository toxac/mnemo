import { createSignal, onMount, For, createEffect } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { listen } from "@tauri-apps/api/event";

function App() {
  const [vaultPath, setVaultPath] = createSignal<string | null>(null);
  const [categories, setCategories] = createSignal<string[]>([]);
  const [selectedCategory, setSelectedCategory] = createSignal<string | null>(null);
  
  // Lists for the current selected category
  const [notes, setNotes] = createSignal<string[]>([]);
  const [attachments, setAttachments] = createSignal<string[]>([]);

  // 1. Logic to fetch categories (folders) from Rust
  const refreshCategories = async (path: string) => {
    try {
      const list = await invoke<string[]>("get_categories", { vaultPath: path });
      setCategories(list);
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    }
  };

  // 2. Logic to fetch files within the selected category
  const refreshFiles = async () => {
    const cat = selectedCategory();
    const path = vaultPath();
    
    if (!cat || !path) {
      setNotes([]);
      setAttachments([]);
      return;
    }

    try {
      // Fetch Markdown notes
      const noteList = await invoke<string[]>("get_files", { 
        vaultPath: path, 
        category: cat, 
        subfolder: "notes" 
      });
      setNotes(noteList);

      // Fetch Binary attachments
      const attachList = await invoke<string[]>("get_files", { 
        vaultPath: path, 
        category: cat, 
        subfolder: "attachments" 
      });
      setAttachments(attachList);
    } catch (err) {
      console.error("Failed to fetch files:", err);
    }
  };

  // 3. Lifecycle & Events
  onMount(async () => {
    try {
      const path = await invoke<string>("get_default_vault");
      setVaultPath(path);
      await refreshCategories(path);

      // Watcher listener: refreshes both UI parts when disk changes
      const unlisten = await listen("vault-changed", async () => {
        console.log("Filesystem change detected.");
        await refreshCategories(vaultPath()!);
        await refreshFiles();
      });

      return () => unlisten();
    } catch (err) {
      console.error("Initialization error:", err);
    }
  });

  // Reactive trigger: Refresh files whenever the category changes
  createEffect(() => {
    refreshFiles();
  });

  // 4. Actions
  const handleCreateCategory = async () => {
    const name = prompt("Enter category name:");
    if (name && vaultPath()) {
      await invoke("create_category", { vaultPath: vaultPath()!, categoryName: name });
      await refreshCategories(vaultPath()!);
    }
  };

  const handleChangeVault = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Select Mnemo Vault"
    });
    if (selected) {
      setVaultPath(selected as string);
      setSelectedCategory(null);
      await refreshCategories(selected as string);
    }
  };

  return (
    <div class="flex h-screen w-full bg-brand-bg text-zinc-100 font-sans overflow-hidden">
      
      {/* Sidebar */}
      <aside class="w-64 bg-brand-sidebar border-r border-brand-border flex flex-col shrink-0">
        <div class="p-4 border-b border-brand-border flex flex-col gap-1">
          <h1 class="font-bold text-lg tracking-tighter">MNEMO</h1>
          <span class="text-[10px] text-zinc-500 font-mono truncate">{vaultPath()}</span>
        </div>
        
        <nav class="flex-1 overflow-y-auto p-2 space-y-1">
          <div class="px-3 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            Categories
          </div>
          
          <For each={categories()}>
            {(category) => (
              <button 
                onClick={() => setSelectedCategory(category)}
                class={`w-full text-left px-3 py-1.5 rounded text-sm transition-all ${
                  selectedCategory() === category 
                    ? 'bg-zinc-800 text-white shadow-sm' 
                    : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                }`}
              >
                {category}
              </button>
            )}
          </For>
        </nav>

        <div class="p-4 border-t border-brand-border flex flex-col gap-2">
          <button 
            onClick={handleCreateCategory}
            class="w-full py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-xs font-medium transition-colors border border-brand-border"
          >
            + New Category
          </button>
          <button 
            onClick={handleChangeVault}
            class="w-full py-1 text-zinc-500 hover:text-zinc-300 text-[10px] transition-colors"
          >
            Switch Vault
          </button>
        </div>
      </aside>

      {/* Main Workspace */}
      <main class="flex-1 flex flex-col min-w-0">
        <header class="h-14 border-b border-brand-border flex items-center px-6 bg-brand-bg/50 backdrop-blur-md">
          <h2 class="text-sm font-medium text-zinc-300 uppercase tracking-wider">
            {selectedCategory() || "Vault Overview"}
          </h2>
        </header>
        
        <div class="flex-1 p-8 overflow-y-auto">
          {!selectedCategory() ? (
            <div class="max-w-md">
              <h2 class="text-2xl font-semibold mb-2 text-zinc-100">Welcome back.</h2>
              <p class="text-zinc-400 text-sm leading-relaxed">
                Your local knowledge vault is synced. Select a category from the sidebar to begin curating your summaries.
              </p>
            </div>
          ) : (
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
              
              {/* Notes Column */}
              <section>
                <h3 class="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-4">Knowledge (Notes)</h3>
                <div class="space-y-2">
                  <For each={notes()}>
                    {(file) => (
                      <div class="group p-3 bg-zinc-900 border border-brand-border rounded hover:border-zinc-500 cursor-pointer transition-all">
                        <span class="text-sm text-zinc-200 group-hover:text-white">{file}</span>
                      </div>
                    )}
                  </For>
                  {notes().length === 0 && (
                    <div class="py-8 border-2 border-dashed border-brand-border rounded flex items-center justify-center">
                      <p class="text-zinc-600 text-xs italic">No curated notes yet.</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Attachments Column */}
              <section>
                <h3 class="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-4">Source Data (Attachments)</h3>
                <div class="space-y-2">
                  <For each={attachments()}>
                    {(file) => (
                      <div class="group p-3 bg-zinc-900/30 border border-brand-border rounded hover:bg-zinc-900 transition-all cursor-help">
                        <span class="text-sm text-zinc-400 group-hover:text-zinc-200">{file}</span>
                      </div>
                    )}
                  </For>
                  {attachments().length === 0 && (
                    <div class="py-8 border-2 border-dashed border-brand-border rounded flex items-center justify-center">
                      <p class="text-zinc-600 text-xs italic">No raw attachments found.</p>
                    </div>
                  )}
                </div>
              </section>

            </div>
          )}
        </div>
      </main>

    </div>
  );
}

export default App;