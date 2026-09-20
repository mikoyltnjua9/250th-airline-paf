import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function UnlinkedExamineePage() {
  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle>Account not set up yet</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Your login isn&apos;t linked to a personnel record, so there are no exams for you to take.
        Please contact the 250th PAW Wing Safety Office.
      </CardContent>
    </Card>
  );
}
