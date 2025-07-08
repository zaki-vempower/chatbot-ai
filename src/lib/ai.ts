import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import {GoogleGenAI} from '@google/genai';
import { Ollama } from 'ollama'
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export type AIProvider = 'openai' | 'claude' | 'gemini' | 'deepseek' | 'llama' | 'bedrock'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export class AIService {
  private openai?: OpenAI
  private anthropic?: Anthropic
  private gemini?: GoogleGenAI
  private deepseek?: OpenAI
  private ollama?: Ollama
  private bedrock?: BedrockRuntimeClient

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      })
    }

    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      })
    }

    if (process.env.GOOGLE_API_KEY) {
      this.gemini = new GoogleGenAI({apiKey: GEMINI_API_KEY});
    }

    if (process.env.DEEPSEEK_API_KEY) {
      this.deepseek = new OpenAI({
        apiKey: process.env.DEEPSEEK_API_KEY,
        baseURL: 'https://api.deepseek.com',
      })
    }

    // Initialize Ollama for local Llama models
    this.ollama = new Ollama({
      host: process.env.OLLAMA_HOST || 'http://localhost:11434',
    })

    // Initialize Bedrock
    if (process.env.AWS_REGION) {
      
      // Use explicit credentials if provided, otherwise use default credential chain
      const credentials = (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) 
      ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        sessionToken: process.env.AWS_SESSION_TOKEN, // Optional, for temporary credentials
      }
      : undefined;
      
      console.log('Initializing AWS Bedrock client...',credentials);


      this.bedrock = new BedrockRuntimeClient({
        region: process.env.AWS_REGION,
        credentials,
      })
    }
  }

  async generateResponse(
    provider: AIProvider,
    messages: ChatMessage[],
    context?: string
  ): Promise<string> {
    let systemPrompt = "You are a helpful AI assistant with access to crawled web content."
    
    if (context) {
      systemPrompt += `

CRAWLED WEB CONTENT AVAILABLE:
${context}

INSTRUCTIONS:
- Use the crawled content above to provide accurate, well-informed responses
- Reference specific sources when citing information from crawled content
- If the user's question relates to topics in the crawled content, prioritize that information
- Combine information from multiple sources when relevant
- Always maintain accuracy and cite sources when possible

Please provide a helpful response based on the conversation and available crawled content:`
    }

    try {
      switch (provider) {
        case 'openai':
          if (!this.openai) throw new Error('OpenAI API key not configured')
          const openaiResponse = await this.openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
              { role: 'system', content: systemPrompt },
              ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
            ],
            max_tokens: 1000,
          })
          return openaiResponse.choices[0]?.message?.content || 'No response generated'

        case 'claude':
          if (!this.anthropic) throw new Error('Anthropic API key not configured')
          const claudeResponse = await this.anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1000,
            system: systemPrompt,
            messages: messages.map(m => ({ role: m.role, content: m.content })),
          })
          return claudeResponse.content[0]?.type === 'text' ? claudeResponse.content[0].text : 'No response generated'

        case 'gemini':
          if (!this.gemini) throw new Error('Google API key not configured')
          
          // Combine system prompt with messages similar to other providers
          const combinedMessages = [
            { role: 'user' as const, parts: [{ text: systemPrompt }] },
            ...messages.map(m => ({
              role: m.role === 'user' ? 'user' as const : 'model' as const,
              parts: [{ text: m.content }]
            }))
          ];

          const result = await this.gemini.models.generateContent({
            model: 'gemini-2.0-flash-001',
            contents: combinedMessages
          });

          return result.text || 'No response generated'

        case 'deepseek':
          if (!this.deepseek) throw new Error('DeepSeek API key not configured')
          const deepseekResponse = await this.deepseek.chat.completions.create({
            model: 'deepseek-chat',
            messages: [
              { role: 'system', content: systemPrompt },
              ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
            ],
            max_tokens: 1000,
          })
          return deepseekResponse.choices[0]?.message?.content || 'No response generated'

        case 'llama':
          if (!this.ollama) throw new Error('Ollama not configured')
          const ollamaModel = process.env.OLLAMA_MODEL || 'llama2'
          
          // Format conversation for Ollama
          const conversationHistory = messages.map(m => `${m.role === 'user' ? 'Human' : 'Assistant'}: ${m.content}`).join('\n')
          const fullPrompt = context 
            ? `${systemPrompt}\n\nConversation:\n${conversationHistory}`
            : conversationHistory

          try {
            const ollamaResponse = await this.ollama.generate({
              model: ollamaModel,
              prompt: fullPrompt,
              stream: false,
            })
            return ollamaResponse.response || 'No response generated'
          } catch (ollamaError) {
            // If Ollama is not running or model not found, provide a helpful error
            if (ollamaError instanceof Error && ollamaError.message.includes('ECONNREFUSED')) {
              throw new Error('Ollama service is not running. Please start Ollama and ensure the model is installed.')
            }
            throw new Error(`Ollama error: ${ollamaError instanceof Error ? ollamaError.message : 'Unknown error'}`)
          }

        case 'bedrock':
          if (!this.bedrock) throw new Error('AWS Bedrock not configured')
          
          console.log('Generating response with Bedrock...');
          
          // Format messages for Claude on Bedrock
          const bedrockMessages = messages.map(m => ({
            role: m.role,
            content: m.content
          }))

          const bedrockPayload = {
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 1000,
            system: systemPrompt,
            messages: bedrockMessages
          }

          try {
            const command = new InvokeModelCommand({
              modelId: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20241022-v2:0',
              body: JSON.stringify(bedrockPayload),
              contentType: 'application/json',
            })

            const response = await this.bedrock.send(command)
            const responseBody = JSON.parse(new TextDecoder().decode(response.body))
            
            return responseBody.content?.[0]?.text || 'No response generated'
          } catch (bedrockError) {
            console.error('Bedrock error details:', bedrockError);
            
            // Handle specific AWS errors
            if (bedrockError instanceof Error) {
              if (bedrockError.message.includes('security token')) {
                throw new Error('AWS credentials are invalid or expired. Please check your AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.')
              }
              if (bedrockError.message.includes('not authorized')) {
                throw new Error('AWS credentials do not have permission to access Bedrock. Please check your IAM permissions.')
              }
              if (bedrockError.message.includes('model')) {
                throw new Error(`Bedrock model not found or not accessible. Check your BEDROCK_MODEL_ID: ${process.env.BEDROCK_MODEL_ID}`)
              }
            }
            
            throw new Error(`Bedrock error: ${bedrockError instanceof Error ? bedrockError.message : 'Unknown error'}`)
          }

        default:
          throw new Error(`Unsupported AI provider: ${provider}`)
      }
    } catch (error) {
      console.error(`Error with ${provider}:`, error)
      throw new Error(`Failed to generate response from ${provider}`)
    }
  }
}

export const aiService = new AIService()
