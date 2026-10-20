import { NextRequest, NextResponse } from 'next/server';
import { handleTelegramMessageAdvanced } from '@/lib/telegram/bot-service';
import { demoStore, TelegramSimMessage } from '@/lib/store/demo-store';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, photoUrl, voiceUrl, messageId, wallets, budgets, transactions, simMessages, userName } = body;

    // Sync state if provided from client to ensure server is aligned with client state
    if (wallets || budgets || transactions || simMessages) {
      demoStore.syncState({
        wallets,
        budgets,
        transactions,
        simMessages,
      });
    }

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const expectedUserText = text || (photoUrl ? '📷 [Foto Struk]' : '🎙️ [Pesan Suara]');

    // Check if user message is already recorded (e.g. from client optimistic update sent in simMessages)
    const currentMsgs = demoStore.getSimMessages();
    const existingUserMsg = currentMsgs.find(
      (m) =>
        (messageId && m.id === messageId) ||
        (m.sender === 'user' &&
          m.text === expectedUserText &&
          currentMsgs.indexOf(m) >= currentMsgs.length - 2)
    );

    // Idempotency: Check if bot already replied to this message
    const botMsgId = messageId ? `msg_b_${messageId}` : undefined;
    const existingBotMsg = botMsgId ? currentMsgs.find((m) => m.id === botMsgId) : undefined;
    if (existingBotMsg) {
      console.log(`[Simulate API] Skipping duplicate simulate request for messageId: ${messageId}`);
      return NextResponse.json({
        ok: true,
        reply: existingBotMsg.text,
        action: existingBotMsg.action,
        userMessage: existingUserMsg || { id: messageId || 'msg_u', sender: 'user', text: expectedUserText, timestamp: timeStr },
        botMessage: existingBotMsg,
        wallets: demoStore.getWallets(),
        budgets: demoStore.getBudgets(),
        transactions: demoStore.getTransactions(),
        recentTransactions: demoStore.getTransactions().slice(0, 5),
        simMessages: demoStore.getSimMessages(),
        defaultWallet: demoStore.getDefaultWallet(),
      });
    }

    let userMsg: TelegramSimMessage;
    if (existingUserMsg) {
      userMsg = existingUserMsg;
    } else {
      userMsg = {
        id: messageId || `msg_u_${Date.now()}`,
        sender: 'user',
        text: expectedUserText,
        timestamp: timeStr,
        type: photoUrl ? 'photo' : voiceUrl ? 'voice' : 'text',
        mediaUrl: photoUrl || voiceUrl,
      };
      demoStore.addSimMessage(userMsg);
    }

    // Handle with bot service (with idempotencyKey to prevent duplicate transactions)
    const idempotencyKey = messageId ? `sim_${messageId}` : `sim_${expectedUserText}_${Math.floor(Date.now() / 2500)}`;
    const resolvedUserName = userName || demoStore.getProfile()?.full_name || 'Muhammad Ghalan';
    const botResult = await handleTelegramMessageAdvanced({
      text,
      photoUrl,
      voiceUrl,
      userName: resolvedUserName,
      idempotencyKey,
    });

    // Add bot reply to simulator history
    const botMsg: TelegramSimMessage = {
      id: messageId ? `msg_b_${messageId}` : `msg_b_${Date.now()}`,
      sender: 'bot',
      text: botResult.text,
      timestamp: timeStr,
      action: botResult.action,
    };
    demoStore.addSimMessage(botMsg);

    return NextResponse.json({
      ok: true,
      reply: botResult.text,
      action: botResult.action,
      userMessage: userMsg,
      botMessage: botMsg,
      wallets: demoStore.getWallets(),
      budgets: demoStore.getBudgets(),
      transactions: demoStore.getTransactions(),
      recentTransactions: demoStore.getTransactions().slice(0, 5),
      simMessages: demoStore.getSimMessages(),
      defaultWallet: demoStore.getDefaultWallet(),
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    messages: demoStore.getSimMessages(),
    wallets: demoStore.getWallets(),
    budgets: demoStore.getBudgets(),
    transactions: demoStore.getTransactions(),
  });
}

export async function DELETE() {
  demoStore.resetSimMessages();
  return NextResponse.json({
    ok: true,
    messages: demoStore.getSimMessages(),
  });
}

