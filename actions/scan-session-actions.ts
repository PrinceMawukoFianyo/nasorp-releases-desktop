"use server"

import { db } from "@/prisma/db"
import { getAuthenticatedUser } from "@/config/useAuth"

const SESSION_TTL_MS = 15 * 60 * 1000 // 15 minutes
const CODE_LENGTH = 6

function generateCode(length = CODE_LENGTH) {
  let code = ""
  for (let i = 0; i < length; i++) {
    code += Math.floor(Math.random() * 10).toString()
  }
  return code
}

// ── PC: start a pairing session for one register/station ─────────────────
// Each register calls this independently, so any number of checkouts can
// run their own phone-scanner pairing at the same time — sessions never
// interact with each other beyond sharing the same org.

export async function createScanSession(stationLabel?: string) {
  try {
    const user = await getAuthenticatedUser()

    const session = await db.scanSession.create({
      data: {
        code: generateCode(),
        orgId: user.orgId,
        stationLabel: stationLabel?.trim() || null,
        createdByUserId: user.id,
        status: "ACTIVE",
        expiresAt: new Date(Date.now() + SESSION_TTL_MS),
        lastActivityAt: new Date(),
      },
    })

    return {
      success: true,
      sessionId: session.id,
      code: session.code,
      expiresAt: session.expiresAt,
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// ── Phone: join a session using the code shown on the PC ─────────────────
// Records which staff member connected, so a busy floor with many phones
// stays auditable — a manager can always see who's scanning on which
// register.

export async function joinScanSession(code: string) {
  try {
    const user = await getAuthenticatedUser()

    const session = await db.scanSession.findFirst({
      where: {
        code: code.trim(),
        orgId: user.orgId,
        status: "ACTIVE",
        expiresAt: { gt: new Date() },
      },
    })

    if (!session) {
      return { success: false, error: "That code is invalid or has expired." }
    }

    await db.scanSession.update({
      where: { id: session.id },
      data: {
        joinedByUserId: user.id,
        joinedByName: user.name,
        lastActivityAt: new Date(),
      },
    })

    return { success: true, sessionId: session.id, stationLabel: session.stationLabel }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// ── Phone: push a scanned value up to the session ─────────────────────────

export async function pushScanEvent(sessionId: string, value: string) {
  try {
    const user = await getAuthenticatedUser()

    const session = await db.scanSession.findFirst({
      where: {
        id: sessionId,
        orgId: user.orgId,
        status: "ACTIVE",
        expiresAt: { gt: new Date() },
      },
    })

    if (!session) {
      return { success: false, error: "This session is no longer active. Reconnect on your phone." }
    }

    await db.scanEvent.create({
      data: { sessionId, value: value.trim() },
    })

    await db.scanSession.update({
      where: { id: sessionId },
      data: { lastActivityAt: new Date() },
    })

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// ── PC: poll for new events since the last one it saw ────────────────────

export async function pollScanEvents(sessionId: string, sinceSeq = 0) {
  try {
    const user = await getAuthenticatedUser()

    const session = await db.scanSession.findFirst({
      where: { id: sessionId, orgId: user.orgId },
    })

    if (!session) {
      return { success: false, error: "Session not found.", events: [], sessionActive: false }
    }

    const events = await db.scanEvent.findMany({
      where: { sessionId, seq: { gt: sinceSeq } },
      orderBy: { seq: "asc" },
      take: 50,
    })

    return {
      success: true,
      events,
      sessionActive: session.status === "ACTIVE" && session.expiresAt > new Date(),
      joinedByName: session.joinedByName,
    }
  } catch (error: any) {
    return { success: false, error: error.message, events: [], sessionActive: false }
  }
}

// ── Manager: list every active register/session in the org right now ─────
// Powers a floor-wide dashboard — every checkout currently paired, who's
// connected to it, and how recently it saw activity.

export async function listActiveScanSessions() {
  try {
    const user = await getAuthenticatedUser()

    const sessions = await db.scanSession.findMany({
      where: {
        orgId: user.orgId,
        status: "ACTIVE",
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        code: true,
        stationLabel: true,
        joinedByName: true,
        lastActivityAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    })

    return { success: true, data: sessions }
  } catch (error: any) {
    return { success: false, error: error.message, data: [] }
  }
}

// ── Either side: end the pairing ──────────────────────────────────────────

export async function closeScanSession(sessionId: string) {
  try {
    const user = await getAuthenticatedUser()

    await db.scanSession.updateMany({
      where: { id: sessionId, orgId: user.orgId },
      data: { status: "CLOSED" },
    })

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}