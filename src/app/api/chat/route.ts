import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { aiService, type AIProvider } from '@/lib/ai'
import { webCrawler } from '@/lib/crawler'
import { verifyToken } from '@/lib/auth'
import { z } from 'zod'

const chatSchema = z.object({
  message: z.string(),
  conversationId: z.string().optional(),
  provider: z.enum(['openai', 'claude', 'gemini', 'deepseek', 'llama', 'bedrock']),
  groupId: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { userId } = verifyToken(token)

    const body = await request.json()
    const { message, conversationId, provider, groupId } = chatSchema.parse(body)

    let conversation
    if (conversationId) {
      conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, userId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            take: 20,
          },
        },
      })

      if (!conversation) {
        return NextResponse.json(
          { error: 'Conversation not found' },
          { status: 404 }
        )
      }
    } else {
      conversation = await prisma.conversation.create({
        data: {
          title: message.substring(0, 50) + '...',
          userId,
        },
        include: { messages: true },
      })
    }

    await prisma.message.create({
      data: {
        content: message,
        role: 'user',
        conversationId: conversation.id,
      },
    })

    let context = ''
    const relevantContext = await webCrawler.searchCrawledData(userId, message)

    if (groupId) {
      const groupLinks = await prisma.crawledData.findMany({
        where: { groupId },
        select: { content: true },
        take: 10,
      })
      context = groupLinks.map((d) => d.content).join('\n\n')
    } else if (relevantContext) {
      context += `RELEVANT CONTEXT:\n${relevantContext}\n\n`
      const allCrawledContext = await webCrawler.getAllCrawledDataAsContext(userId, 8)
      if (allCrawledContext) {
        context += `ADDITIONAL CRAWLED DATA:\n${allCrawledContext}`
      }
    } else {
      context = await webCrawler.getAllCrawledDataAsContext(userId, 8)
    }

    const messages = conversation.messages.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }))
    messages.push({ role: 'user', content: message })

    const aiResponse = await aiService.generateResponse(
      provider as AIProvider,
      messages,
      context || undefined
    )

    const responseMessage = await prisma.message.create({
      data: {
        content: aiResponse,
        role: 'assistant',
        conversationId: conversation.id,
      },
    })

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        title: conversation.title,
      },
      message: {
        id: responseMessage.id,
        content: aiResponse,
        role: 'assistant',
        createdAt: responseMessage.createdAt,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Chat error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}