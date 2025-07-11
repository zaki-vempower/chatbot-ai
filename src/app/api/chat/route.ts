
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { aiService, type AIProvider } from '@/lib/ai'
import { webCrawler } from '@/lib/crawler'
import { verifyToken } from '@/lib/auth'
import { z } from 'zod'

const chatSchema = z.object({
  message: z.string(),
  conversationId: z.string().optional(),
  provider: z.enum(['openai', 'claude', 'gemini', 'deepseek', 'llama']),
})

export async function POST(request: NextRequest) {
  try {
    // Get authorization token
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { userId } = verifyToken(token)

    const body = await request.json()
    const { message, conversationId, provider } = chatSchema.parse(body)

    let conversation
    if (conversationId) {
      // Get existing conversation
      conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          userId,
        },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            take: 20, // Limit context to last 20 messages
          },
        },
      })

      if (!conversation) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
      }
    } else {
      // Create new conversation
      conversation = await prisma.conversation.create({
        data: {
          title: message.substring(0, 50) + '...',
          userId,
        },
        include: {
          messages: true,
        },
      })
    }

    // Save user message
    await prisma.message.create({
      data: {
        content: message,
        role: 'user',
        conversationId: conversation.id,
      },
    })

    // Search for relevant crawled data
    const relevantContext = await webCrawler.searchCrawledData(userId, message)
    
    // Get all crawled data as additional context
    const allCrawledContext = await webCrawler.getAllCrawledDataAsContext(userId, 8)
    
    // Combine contexts
    let context = ''
    if (relevantContext) {
      context += `RELEVANT CONTEXT:\n${relevantContext}\n\n`
    }
    if (allCrawledContext) {
      context += `ADDITIONAL CRAWLED DATA:\n${allCrawledContext}`
    }

    // Prepare messages for AI
    const messages = conversation.messages.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }))
    messages.push({ role: 'user', content: message })

    // Generate response from AI
    const aiResponse = await aiService.generateResponse(
      provider as AIProvider,
      messages,
      context || undefined
    )

    // Save AI response
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

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { aiService, type AIProvider } from '@/lib/ai'
import { webCrawler } from '@/lib/crawler'
import { verifyToken } from '@/lib/auth'
import { z } from 'zod'

const chatSchema = z.object({
  message: z.string(),
  conversationId: z.string().optional(),
  provider: z.enum(['openai', 'claude', 'gemini', 'deepseek', 'llama','bedrock']),
})

export async function POST(request: NextRequest) {
  try {
    // Get authorization token
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { userId } = verifyToken(token)

    const body = await request.json()
    const { message, conversationId, provider } = chatSchema.parse(body)

    let conversation
    if (conversationId) {
      // Get existing conversation
      conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          userId,
        },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            take: 20, // Limit context to last 20 messages
          },
        },
      })

      if (!conversation) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
      }
    } else {
      // Create new conversation
      conversation = await prisma.conversation.create({
        data: {
          title: message.substring(0, 50) + '...',
          userId,
        },
        include: {
          messages: true,
        },
      })
    }

    // Save user message
    await prisma.message.create({
      data: {
        content: message,
        role: 'user',
        conversationId: conversation.id,
      },
    })

    // Search for relevant crawled data
    const relevantContext = await webCrawler.searchCrawledData(userId, message)
    
    // Get all crawled data as additional context
    const allCrawledContext = await webCrawler.getAllCrawledDataAsContext(userId, 8)
    
    // Combine contexts
    let context = ''
    if (relevantContext) {
      context += `RELEVANT CONTEXT:\n${relevantContext}\n\n`
    }
    if (allCrawledContext) {
      context += `ADDITIONAL CRAWLED DATA:\n${allCrawledContext}`
    }

    // Prepare messages for AI
    const messages = conversation.messages.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }))
    messages.push({ role: 'user', content: message })

    // Generate response from AI
    const aiResponse = await aiService.generateResponse(
      provider as AIProvider,
      messages,
      context || undefined
    )

    // Save AI response
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

