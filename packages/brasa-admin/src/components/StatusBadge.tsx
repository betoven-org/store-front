type Props = {
  status: "draft" | "published";
};

export default function StatusBadge({ status }: Props) {
  const isDraft = status === "draft";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isDraft
          ? "bg-warning-bg text-warning"
          : "bg-success-bg text-success"
      }`}
    >
      {isDraft ? "Rascunho" : "Publicado"}
    </span>
  );
}
