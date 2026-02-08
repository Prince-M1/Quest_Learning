import { getToken } from "./AuthContext"; // We need this to prove who we are to MongoDB

const API_BASE_URL = "http://localhost:5000/api";

// This helper handles the "Talking" to your MongoDB server
async function apiRequest(endpoint, method = "GET", body = null) {
  const token = localStorage.getItem("token"); // Get your login key
  const headers = {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };

  const config = {
    method,
    headers,
  };

  if (body) config.body = JSON.stringify(body);

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Server Error");
  }
  return response.json();
}

export class CustomEntity {
  constructor(tableName) {
    this.tableName = tableName;
  }

  // GET ALL
  async list() {
    try {
      return await apiRequest(`/${this.tableName}`);
    } catch (error) {
      console.error(`Error listing ${this.tableName}:`, error);
      return [];
    }
  }

  // SEARCH / FILTER
  async filter(conditions = {}) {
    try {
      // For now, we'll fetch all and filter locally to keep it simple
      // or you can build a query string if your backend supports it
      return await apiRequest(`/${this.tableName}`);
    } catch (error) {
      return [];
    }
  }

  // GET ONE
  async get(id) {
    try {
      return await apiRequest(`/${this.tableName}/${id}`);
    } catch (error) {
      return null;
    }
  }

  // CREATE NEW
  async create(data) {
    return await apiRequest(`/${this.tableName}`, "POST", data);
  }

  // UPDATE
  async update(id, data) {
    return await apiRequest(`/${this.tableName}/${id}`, "PUT", data);
  }

  // DELETE
  async delete(id) {
    return await apiRequest(`/${this.tableName}/${id}`, "DELETE");
  }
}

export class UserEntity extends CustomEntity {
  constructor() {
    super("users");
  }

  async me() {
    return await apiRequest("/auth/me");
  }

  async logout() {
    localStorage.removeItem("token");
    window.location.href = "/login";
  }

  async isAuthenticated() {
    return !!localStorage.getItem("token");
  }
}

// --- FACTORY (The part that makes everything work together) ---

function entityNameToTableName(name) {
  return name.replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_/, "");
}

export function createCustomClient() {
  const userEntity = new UserEntity();
  const entityCache = new Map();

  const entities = new Proxy({}, {
    get(_, name) {
      if (typeof name !== "string") return undefined;
      if (entityCache.has(name)) return entityCache.get(name);
      
      const entity = (name === "User") 
        ? userEntity 
        : new CustomEntity(entityNameToTableName(name));
      
      entityCache.set(name, entity);
      return entity;
    }
  });

  return {
    entities,
    auth: {
      me: () => userEntity.me(),
      logout: () => userEntity.logout(),
      isAuthenticated: () => userEntity.isAuthenticated(),
    },
    integrations: {
        Core: {
            InvokeLLM: async () => "AI feature coming soon to MongoDB version",
            SendEmail: async () => ({ status: "mocked" }),
            UploadFile: async () => ({ file_url: "" }),
        }
    }
  };
}

export const customClient = createCustomClient();