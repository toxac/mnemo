import { createSignal, onMount, For } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

function App() {
  const [vaultPath, setVaultPath] = createSignal<string | null>(null);
  const [categories, setCategories] = createSignal<string[]>([]);
  const [selectedCategory, setSelectedCategory] = createSignal<string | null>(null);

  // 1. Logic to fetch categories from Rust
  const refreshCategories = async (path: string) => {
    try {
      const list = await invoke<string[]>("get_categories", { vaultPath: path });
      setCategories(list);
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    }
  };

  onMount(async () => {
    try {
      // 2. Initialize default vault
      const path = await invoke<string>("get_default_vault");
      setVaultPath(path);
      await refreshCategories(path);
    } catch (err) {
      console.error("Initialization error:", err);
    }
  });

  const handleCreateCategory = async () => {
    const name = prompt("Enter category name:");
    if (name && vaultPath()) {
      await invoke("create_category", { vaultPath: vaultPath(), categoryName: name });
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
      await refreshCategories(selected as string);
    }
  };

  return (
    <div class="flex h-screen w-full bg-brand-bg text-zinc-100 font-sans">
      
      {/* Sidebar */}
      <aside class="w-64 bg-brand-sidebar border-r border-brand-border flex flex-col">
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
      <main class="flex-1 flex flex-col">
        <header class="h-14 border-b border-brand-border flex items-center px-6 bg-brand-bg/50 backdrop-blur-md">
          <h2 class="text-sm font-medium text-zinc-300">
            {selectedCategory() || "Overview"}
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
            <div>
              <p class="text-zinc-500 text-sm">Content for {selectedCategory()} will appear here.</p>
            </div>
          )}
        </div>
      </main>

    </div>
  );
}

export default App;