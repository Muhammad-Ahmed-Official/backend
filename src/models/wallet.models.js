import { supabase } from '../config/supabase.js';

export class Wallet {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id;
    this.balance = parseFloat(data.balance) || 0;
    this.escrowBalance = parseFloat(data.escrow_balance) || 0;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      balance: this.balance,
      escrowBalance: this.escrowBalance,
      total: this.balance + this.escrowBalance,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  static async findByUserId(userId) {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error || !data) return null;
    return new Wallet(data);
  }

  static async createOrGet(userId) {
    let wallet = await Wallet.findByUserId(userId);
    if (!wallet) {
      const { data, error } = await supabase
        .from('wallets')
        .insert({ user_id: userId })
        .select()
        .single();
      if (error) throw error;
      wallet = new Wallet(data);
    }
    return wallet;
  }

  static async updateBalance(userId, amount, type = 'balance') {
    const wallet = await Wallet.createOrGet(userId);
    const updateData = {};
    
    if (type === 'balance') {
      updateData.balance = wallet.balance + amount;
    } else if (type === 'escrow') {
      updateData.escrow_balance = wallet.escrowBalance + amount;
    }
    
    updateData.updated_at = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('wallets')
      .update(updateData)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return new Wallet(data);
  }
}

export class Transaction {
  constructor(data) {
    this.id = data.id;
    this.walletId = data.wallet_id;
    this.userId = data.user_id;
    this.type = data.type;
    this.amount = parseFloat(data.amount) || 0;
    this.description = data.description;
    this.status = data.status;
    this.projectId = data.project_id;
    this.createdAt = data.created_at;
    // Joined data
    this.project = data.project || null;
  }

  toJSON() {
    return {
      id: this.id,
      walletId: this.walletId,
      userId: this.userId,
      type: this.type,
      amount: this.amount,
      description: this.description,
      status: this.status,
      projectId: this.projectId,
      createdAt: this.createdAt,
      project: this.project,
    };
  }

  static async findByUserId(userId, limit = 50) {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        project:projects(id, title)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return (data || []).map(item => new Transaction(item));
  }

  static async create(transactionData) {
    const { data, error } = await supabase
      .from('transactions')
      .insert(transactionData)
      .select(`
        *,
        project:projects(id, title)
      `)
      .single();
    
    if (error) throw error;
    return new Transaction(data);
  }
}
