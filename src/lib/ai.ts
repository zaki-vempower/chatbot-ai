import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Ollama } from 'ollama';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

export type AIProvider = 'openai' | 'claude' | 'gemini' | 'deepseek' | 'llama' | 'bedrock';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class AIService {
  private openai?: OpenAI;
  private anthropic?: Anthropic;
  private gemini?: GoogleGenerativeAI;
  private deepseek?: OpenAI;
  private ollama?: Ollama;
  private bedrock?: BedrockRuntimeClient;

  constructor() {
    // Initialize OpenAI
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }

    // Initialize Anthropic Claude
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    }

    // Initialize Google Gemini
    if (process.env.GOOGLE_API_KEY) {
      this.gemini = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    }

    // Initialize Deepseek
    if (process.env.DEEPSEEK_API_KEY) {
      this.deepseek = new OpenAI({
        apiKey: process.env.DEEPSEEK_API_KEY,
        baseURL: 'https://api.deepseek.com',
      });
    }

    // Initialize Ollama for local Llama models
    this.ollama = new Ollama({
      host: process.env.OLLAMA_HOST || 'http://localhost:11434',
    });

    // Initialize AWS Bedrock
    if (process.env.AWS_REGION) {
      const credentials = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY 
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            sessionToken: process.env.AWS_SESSION_TOKEN,
          }
        : undefined;

      this.bedrock = new BedrockRuntimeClient({
        region: process.env.AWS_REGION,
        credentials,
      });
    }
  }

  private getSystemPrompt(context?: string): string {
    let systemPrompt = "You are a helpful AI assistant with access to crawled web content.";

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

Please provide a helpful response based on the conversation and available crawled content:`;
    }

    return systemPrompt;
  }

  async generateResponse(
    provider: AIProvider,
    messages: ChatMessage[],
    context?: string
  ): Promise<string> {
    const systemPrompt = this.getSystemPrompt(context);

    try {
      switch (provider) {
        case 'openai':
          if (!this.openai) throw new Error('OpenAI API key not configured');
          const openaiResponse = await this.openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
            messages: [
              { role: 'system', content: systemPrompt },
              ...messages.map(m => ({
                role: m.role as 'user' | 'assistant',
                content: m.content,
              })),
            ],
            max_tokens: 1000,
          });
          return openaiResponse.choices[0]?.message?.content || 'No response generated';

        case 'claude':
          if (!this.anthropic) throw new Error('Anthropic API key not configured');
          const claudeResponse = await this.anthropic.messages.create({
            model: process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307',
            max_tokens: 1000,
            system: systemPrompt,
            messages: messages.map(m => ({
              role: m.role,
              content: m.content,
            })),
          });
          return claudeResponse.content[0]?.type === 'text'
            ? claudeResponse.content[0].text
            : 'No response generated';

        case 'gemini':
          if (!this.gemini) throw new Error('Google API key not configured');
          const model = this.gemini.getGenerativeModel({ 
            model: process.env.GEMINI_MODEL || 'gemini-pro' 
          });
          const chat = model.startChat({
            history: messages.slice(0, -1).map(m => ({
              role: m.role === 'user' ? 'user' : 'model',
              parts: [{ text: m.content }],
            })),
          });
          const lastMessage = messages[messages.length - 1];
          const prompt = context
            ? `${systemPrompt}\n\nUser: ${lastMessage.content}`
            : lastMessage.content;
          const result = await chat.sendMessage(prompt);
          return result.response.text();

        case 'deepseek':
          if (!this.deepseek) throw new Error('DeepSeek API key not configured');
          const deepseekResponse = await this.deepseek.chat.completions.create({
            model: 'deepseek-chat',
            messages: [
              { role: 'system', content: systemPrompt },
              ...messages.map(m => ({
                role: m.role as 'user' | 'assistant',
                content: m.content,
              })),
            ],
            max_tokens: 1000,
          });
          return deepseekResponse.choices[0]?.message?.content || 'No response generated';

        case 'llama':
          if (!this.ollama) throw new Error('Ollama not configured');
          const ollamaModel = process.env.OLLAMA_MODEL || 'llama2';

          const conversationHistory = messages
            .map(m => `${m.role === 'user' ? 'Human' : 'Assistant'}: ${m.content}`)
            .join('\n');
          const fullPrompt = context
            ? `${systemPrompt}\n\nConversation:\n${conversationHistory}`
            : conversationHistory;

          try {
            const ollamaResponse = await this.ollama.generate({
              model: ollamaModel,
              prompt: fullPrompt,
              stream: false,
            });
            return ollamaResponse.response || 'No response generated';
          } catch (ollamaError) {
            if (ollamaError instanceof Error && ollamaError.message.includes('ECONNREFUSED')) {
              throw new Error(
                'Ollama service is not running. Please start Ollama and ensure the model is installed.'
              );
            }
            throw new Error(
              `Ollama error: ${
                ollamaError instanceof Error ? ollamaError.message : 'Unknown error'
              }`
            );
          }

        case 'bedrock':
          if (!this.bedrock) throw new Error('AWS Bedrock not configured');
          
          const bedrockMessages = messages.map(m => ({
            role: m.role,
            content: m.content
          }));

          const bedrockPayload = {
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 1000,
            system: systemPrompt,
            messages: bedrockMessages
          };

          try {
            const command = new InvokeModelCommand({
              modelId: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-haiku-20240307-v1:0',
              body: JSON.stringify(bedrockPayload),
              contentType: 'application/json',
            });

            const response = await this.bedrock.send(command);
            const responseBody = JSON.parse(new TextDecoder().decode(response.body));
            
            return responseBody.content?.[0]?.text || 'No response generated';
          } catch (bedrockError) {
            if (bedrockError instanceof Error) {
              if (bedrockError.message.includes('security token')) {
                throw new Error('AWS credentials are invalid or expired. Please check your AWS credentials.');
              }
              if (bedrockError.message.includes('not authorized')) {
                throw new Error('AWS credentials do not have permission to access Bedrock.');
              }
              if (bedrockError.message.includes('model')) {
                throw new Error('Bedrock model not found or not accessible.');
              }
            }
            
            throw new Error(`Bedrock error: ${
              bedrockError instanceof Error ? bedrockError.message : 'Unknown error'
            }`);
          }

        default:
          throw new Error(`Unsupported AI provider: ${provider}`);
      }
    } catch (error) {
      console.error(`Error with ${provider}:`, error);
      throw new Error(`Failed to generate response from ${provider}`);
    }
  }
}

export const aiService = new AIService();