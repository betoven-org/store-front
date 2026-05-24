type Props = {
  status: "draft" | "published";
};

export default function StatusBadge({ status }: Props) {
  const isDraft = status === "draft";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-medium leading-none ${
        isDraft
          ? "bg-warning-bg text-warning"
          : "bg-success-bg text-success"
      }`}
    >
      <span
        className={`h-[5px] w-[5px] rounded-full ${
          isDraft ? "bg-warning" : "bg-success"
        }`}
      />
      {isDraft ? "Rascunho" : "Publicado"}
    </span>
  );
}
