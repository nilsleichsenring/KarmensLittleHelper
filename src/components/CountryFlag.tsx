// src/components/CountryFlag.tsx
type Props = {
  code: string | null;
  size?: number;
};

export function CountryFlag({ code, size = 20 }: Props) {
  if (!code) return <span>🏳️</span>;

  const upper = code.toUpperCase();

  return (
    <img
      src={`/flags/${upper}.svg`}
      alt={upper}
      style={{
        width: size,
        height: size,
        objectFit: "cover",
        display: "inline-block",
        verticalAlign: "middle",
      }}
    />
  );
}

export default CountryFlag;
