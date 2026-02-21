type SessionItem = {
  front?: string | null;
  back?: string | null;
};

export function getSessionCardText(item: SessionItem | undefined) {
  return {
    front: item?.front?.trim() || "Pergunta indisponivel",
    back: item?.back?.trim() || "Resposta indisponivel",
  };
}

export function getSessionProgress(currentIndex: number, total: number) {
  if (total <= 0) return 0;
  return (currentIndex / total) * 100;
}
