import { NextResponse } from 'next/server';

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

// 1. GET Request: Meta verification
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

// 2. POST Request: WhatsApp webhook
export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.object === "whatsapp_business_account") {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const message = value?.messages?.[0];

      if (message?.type === "text") {
        const incomingText = message.text.body;
        const senderPhone = message.from;

        // DEBUG LOG
        console.log("👉 INCOMING MESSAGE TEXT:", incomingText);

        if (
          incomingText.includes(
            "Hello, I am at the hotel and would like to see the Tours PDF!"
          )
        ) {
          await sendPdfDocument(senderPhone);
        }
      }
    }

    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// 3. Send PDF via Meta API
async function sendPdfDocument(recipientPhone: string) {
  const url = `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipientPhone,
    type: "document",
    document: {
      link: "https://hotel-bot-chi.vercel.app/tours.pdf",
      caption:
        "Welcome to our Hotel! 🏨 Here is your Tours & Cruises guide. Let me know what you want to book!",
      filename: "Hotel_Tours_Cruises.pdf",
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  // DEBUG LOGS (Meta response)
  const responseData = await response.json();

  console.log("👉 META API STATUS:", response.status);
  console.log("👉 META API RESPONSE:", JSON.stringify(responseData, null, 2));
}