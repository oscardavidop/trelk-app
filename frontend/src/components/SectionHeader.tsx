interface SectionHeaderProps {
  title: string;
}

export default function SectionHeader({ title }: SectionHeaderProps) {
  return (
    <div className="tm-section-header">
      <h2>{title}</h2>
    </div>
  );
}

