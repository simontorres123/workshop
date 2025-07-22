type Props = {
  params: {
    folio: string;
  };
};

export default function TrackPage({ params }: Props) {
  const { folio } = params;

  return (
    <div>
      <h1>Seguimiento del folio: {folio}</h1>
    </div>
  );
}
