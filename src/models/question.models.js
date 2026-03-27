import { supabase } from '../config/supabase.js';

export class Question {
  constructor(data) {
    this.id = data.id;
    this.skill = data.skill;
    this.level = data.level;           // 'Bronze' | 'Silver' | 'Gold'
    this.languageId = data.language_id;
    this.title = data.title;
    this.description = data.description;
    this.inputFormat = data.input_format;
    this.outputFormat = data.output_format;
    this.example = data.example;
    this.testCases = data.test_cases;  // NEVER sent to client
    this.isActive = data.is_active;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  // Safe public view — no test cases
  toPublicJSON() {
    return {
      id: this.id,
      skill: this.skill,
      level: this.level,
      language_id: this.languageId,
      title: this.title,
      description: this.description,
      inputFormat: this.inputFormat,
      outputFormat: this.outputFormat,
      example: this.example,
      totalTestCases: Array.isArray(this.testCases) ? this.testCases.length : 0,
    };
  }

  // Full admin view — includes test cases
  toAdminJSON() {
    return { ...this.toPublicJSON(), testCases: this.testCases };
  }

  // Fetch one question by skill + level (random if multiple exist)
  static async findBySkillAndLevel(skill, level) {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('skill', skill)
      .eq('level', level)
      .eq('is_active', true);

    if (error) throw error;
    if (!data || data.length === 0) return null;

    // Pick randomly among available questions for that level
    const random = data[Math.floor(Math.random() * data.length)];
    return new Question(random);
  }

  // Get all available skills + their available levels
  static async getAvailableSkillsWithLevels() {
    const { data, error } = await supabase
      .from('questions')
      .select('skill, level')
      .eq('is_active', true)
      .order('skill');

    if (error) throw error;

    // Group: { Python: ['Bronze','Silver','Gold'], ... }
    const map = {};
    for (const row of data || []) {
      if (!map[row.skill]) map[row.skill] = new Set();
      map[row.skill].add(row.level);
    }
    return Object.entries(map).map(([skill, levels]) => ({
      skill,
      levels: [...levels].sort((a, b) => {
        const order = { Bronze: 0, Silver: 1, Gold: 2 };
        return order[a] - order[b];
      }),
    }));
  }

  // Admin: list all questions (no test cases in response)
  static async findAll({ skill, level } = {}) {
    let query = supabase.from('questions').select('*').order('skill').order('level');
    if (skill) query = query.eq('skill', skill);
    if (level) query = query.eq('level', level);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(d => new Question(d));
  }

  static async findById(id) {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) return null;
    return new Question(data);
  }

  static async create(payload) {
    const { data, error } = await supabase
      .from('questions')
      .insert({
        skill: payload.skill,
        level: payload.level,
        language_id: payload.languageId,
        title: payload.title,
        description: payload.description,
        input_format: payload.inputFormat,
        output_format: payload.outputFormat,
        example: payload.example,
        test_cases: payload.testCases,
        is_active: payload.isActive ?? true,
      })
      .select()
      .single();
    if (error) throw error;
    return new Question(data);
  }

  static async update(id, payload) {
    const fields = {};
    if (payload.title !== undefined)       fields.title = payload.title;
    if (payload.description !== undefined) fields.description = payload.description;
    if (payload.inputFormat !== undefined) fields.input_format = payload.inputFormat;
    if (payload.outputFormat !== undefined)fields.output_format = payload.outputFormat;
    if (payload.example !== undefined)     fields.example = payload.example;
    if (payload.testCases !== undefined)   fields.test_cases = payload.testCases;
    if (payload.isActive !== undefined)    fields.is_active = payload.isActive;
    fields.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('questions')
      .update(fields)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return new Question(data);
  }

  static async remove(id) {
    const { error } = await supabase.from('questions').delete().eq('id', id);
    if (error) throw error;
  }
}
