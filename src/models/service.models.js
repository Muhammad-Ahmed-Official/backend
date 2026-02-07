import { supabase } from '../config/supabase.js';

export class ServiceCategory {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.image = data.image; // Background image URL
        this.color = data.color; // Theme color
        this.createdAt = data.created_at;
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            image: this.image,
            color: this.color,
            createdAt: this.createdAt,
        };
    }

    static async findAll() {
        const { data, error } = await supabase
            .from('service_categories')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;
        return (data || []).map(item => new ServiceCategory(item));
    }

    static async create(serviceData) {
        const payload = {};
        if (serviceData.name != null) payload.name = serviceData.name;
        if (serviceData.image != null) payload.image = serviceData.image;

        const { data, error } = await supabase
            .from('service_categories')
            .insert(payload)
            .select()
            .single();

        if (error) throw error;
        return new ServiceCategory(data);
    }

    static async findByIdAndUpdate(id, updateData) {
        const payload = {};
        if (updateData.name != null) payload.name = updateData.name;
        if (updateData.image != null) payload.image = updateData.image;
        // color theme option removed from UI; do not update color from request
        if (Object.keys(payload).length === 0) return null;

        const { data, error } = await supabase
            .from('service_categories')
            .update(payload)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data ? new ServiceCategory(data) : null;
    }

    static async delete(id) {
        const { error } = await supabase
            .from('service_categories')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    }
}
