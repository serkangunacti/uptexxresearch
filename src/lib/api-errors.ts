import { NextResponse } from "next/server";

export function jsonError(error: unknown, fallback = "Sunucu hatasi") {
  if (error instanceof Error) {
    switch (error.message) {
      case "UNAUTHORIZED":
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      case "FORBIDDEN":
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      case "NOT_FOUND":
        return NextResponse.json({ error: "Bulunamadi" }, { status: 404 });
      case "SUBSCRIPTION_NOT_FOUND":
        return NextResponse.json({ error: "Abonelik bulunamadi." }, { status: 404 });
      case "INVALID_CREDENTIAL":
        return NextResponse.json({ error: "Secili API key gecersiz." }, { status: 400 });
      case "INVALID_MODEL":
        return NextResponse.json({ error: "Secili model bu API key icin gecersiz." }, { status: 400 });
      case "PACKAGE_RESTRICTED":
        return NextResponse.json({ error: "Bu ajan paketinizde acik degil." }, { status: 403 });
      case "CUSTOM_TEMPLATE_RESTRICTED":
        return NextResponse.json({ error: "Custom ajan olusturma bu pakette acik degil." }, { status: 403 });
      case "COMING_SOON":
        return NextResponse.json({ error: "Bu ajan yakinda aktif olacak." }, { status: 400 });
      case "TASK_REQUIRED":
        return NextResponse.json({ error: "En az bir gorev secilmelidir." }, { status: 400 });
      case "PLATFORM_REQUIRED":
        return NextResponse.json({ error: "En az bir platform secilmelidir." }, { status: 400 });
      case "LEAGUE_REQUIRED":
        return NextResponse.json({ error: "En az bir lig secilmelidir." }, { status: 400 });
      case "AGENT_LIMIT_REACHED":
        return NextResponse.json({ error: "Paketinizin aktif ajan limitine ulastiniz." }, { status: 400 });
      case "TEMPLATE_NAME_AND_PROMPT_REQUIRED":
        return NextResponse.json({ error: "Ajan adi ve ana prompt zorunludur." }, { status: 400 });
      case "TEMPLATE_TASK_REQUIRED":
        return NextResponse.json({ error: "En az bir gorev tanimlamalisiniz." }, { status: 400 });
    }

    if (error.message.startsWith("FIELD_REQUIRED:")) {
      const fieldKey = error.message.split(":")[1];
      return NextResponse.json({ error: `${fieldKey} alani zorunludur.` }, { status: 400 });
    }
  }

  return NextResponse.json({ error: fallback }, { status: 500 });
}
