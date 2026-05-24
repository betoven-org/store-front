const fmt = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function formatDate(dateString: string): string {
  return fmt.format(new Date(dateString));
}
