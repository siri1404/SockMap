// API service for communicating with the backend
const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  timestamp?: number;
}

export interface SocketData {
  pid: number;
  process_name: string;
  local_address: string;
  remote_address: string;
  state: string;
  protocol: string;
  memory_usage: number;
  is_hung: boolean;
  has_leak: boolean;
}

export interface MemorySegment {
  pid: number;
  address: string;
  size: number;
  permissions: string;
  type: string;
  is_shared: boolean;
}

export interface ProcessData {
  pid: number;
  name: string;
  socket_count: number;
  memory_usage: number;
  cpu_usage: number;
  status: string;
}

export interface TraceData {
  sockets: SocketData[];
  memory: MemorySegment[];
  processes: ProcessData[];
  timestamp: number;
}

class ApiService {
  private async fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 10000): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }


  async healthCheck(): Promise<ApiResponse<{ status: string; binary_exists: boolean; binary_path: string }>> {
    try {
      const response = await this.fetchWithTimeout(`${API_BASE_URL}/health`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      console.error('Health check failed:', error);
      return { 
        error: error instanceof Error ? error.message : 'Health check failed'
      };
    }
  }

  async traceSockets(): Promise<ApiResponse<TraceData>> {
    try {
      const response = await this.fetchWithTimeout(`${API_BASE_URL}/trace-sockets`, {}, 30000);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Transform the data to match our frontend interfaces
      const transformedData: TraceData = {
        sockets: data.sockets?.map((socket: any) => ({
          pid: socket.pid,
          process_name: socket.process_name,
          local_address: socket.local_address,
          remote_address: socket.remote_address,
          state: socket.state,
          protocol: socket.protocol,
          memory_usage: socket.memory_usage,
          is_hung: socket.is_hung,
          has_leak: socket.has_leak,
        })) || [],
        memory: data.memory?.map((mem: any) => ({
          pid: mem.pid,
          address: mem.address,
          size: mem.size,
          permissions: mem.permissions,
          type: mem.type,
          is_shared: mem.is_shared,
        })) || [],
        processes: data.processes?.map((proc: any) => ({
          pid: proc.pid,
          name: proc.name,
          socket_count: proc.socket_count,
          memory_usage: proc.memory_usage,
          cpu_usage: proc.cpu_usage,
          status: proc.status,
        })) || [],
        timestamp: data.timestamp || Date.now(),
      };

      return { data: transformedData };
    } catch (error) {
      console.error('Trace sockets failed:', error);
      return { 
        error: error instanceof Error ? error.message : 'Failed to trace sockets'
      };
    }
  }

  async getSockets(): Promise<ApiResponse<{ sockets: SocketData[]; timestamp: number }>> {
    try {
      const response = await this.fetchWithTimeout(`${API_BASE_URL}/sockets`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      console.error('Get sockets failed:', error);
      return { 
        error: error instanceof Error ? error.message : 'Failed to get sockets',
      };
    }
  }

  async getMemory(): Promise<ApiResponse<{ memory: MemorySegment[]; timestamp: number }>> {
    try {
      const response = await this.fetchWithTimeout(`${API_BASE_URL}/memory`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      console.error('Get memory failed:', error);
      return { 
        error: error instanceof Error ? error.message : 'Failed to get memory data',
      };
    }
  }

  async getProcesses(): Promise<ApiResponse<{ processes: ProcessData[]; timestamp: number }>> {
    try {
      const response = await this.fetchWithTimeout(`${API_BASE_URL}/processes`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      console.error('Get processes failed:', error);
      return { 
        error: error instanceof Error ? error.message : 'Failed to get processes',
      };
    }
  }
}

export const apiService = new ApiService();