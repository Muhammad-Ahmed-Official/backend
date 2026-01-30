import { supabase } from '../config/supabase.js';

export class ServiceCategory {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.icon = data.icon;
        this.image = data.image; // Background image URL
        this.color = data.color; // Theme color
        this.createdAt = data.created_at;
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            icon: this.icon,
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
        const { data, error } = await supabase
            .from('service_categories')
            .insert({
                name: serviceData.name,
                icon: serviceData.icon,
                image: serviceData.image,
                color: serviceData.color
            })
            .select()
            .single();

        if (error) throw error;
        return new ServiceCategory(data);
    }

    static async findByIdAndUpdate(id, updateData) {
        const { data, error } = await supabase
            .from('service_categories')
            .update({
                name: updateData.name,
                icon: updateData.icon,
                image: updateData.image,
                color: updateData.color
            })
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
