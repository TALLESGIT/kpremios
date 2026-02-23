// =====================================================
// ChatSlotRegistry - Registro global de slots de chat
// =====================================================

export interface ChatSlot {
  id: string;
  container: HTMLElement;
  priority: number;
}

const slots = new Map<string, ChatSlot>();
const listeners = new Set<() => void>();

export function registerChatSlot(id: string, slot: ChatSlot) {
  slots.set(id, slot);
  notifyListeners();
}

export function unregisterChatSlot(id: string) {
  slots.delete(id);
  notifyListeners();
}

export function getActiveSlot(): ChatSlot | null {
  if (slots.size === 0) return null;

  // Retornar slot com maior prioridade
  let maxPriority = -Infinity;
  let activeSlot: ChatSlot | null = null;

  for (const slot of slots.values()) {
    // Verificar se o container ainda está no DOM
    if (!document.contains(slot.container)) {
      continue;
    }

    if (slot.priority > maxPriority) {
      maxPriority = slot.priority;
      activeSlot = slot;
    }
  }

  return activeSlot;
}

export function getAllSlots(): ChatSlot[] {
  return Array.from(slots.values()).filter(slot => 
    document.contains(slot.container)
  );
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners() {
  listeners.forEach(listener => listener());
}
