import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AddressRow } from '../types';

type Value = { province_id?: string | null; district_id?: string | null; commune_id?: string | null; village_id?: string | null; address?: string | null };
export default function AddressSelect({ value, onChange }: { value: Value; onChange: (patch: Value) => void }) {
  const [provinces, setProvinces] = useState<AddressRow[]>([]);
  const [districts, setDistricts] = useState<AddressRow[]>([]);
  const [communes, setCommunes] = useState<AddressRow[]>([]);
  const [villages, setVillages] = useState<AddressRow[]>([]);

  useEffect(() => { supabase.from('provinces').select('*').order('name_km').then(({ data }) => setProvinces(data || [])); }, []);
  useEffect(() => {
    setDistricts([]); setCommunes([]); setVillages([]);
    if (!value.province_id) return;
    supabase.from('districts').select('*').eq('province_id', value.province_id).order('name_km').then(({ data }) => setDistricts(data || []));
  }, [value.province_id]);
  useEffect(() => {
    setCommunes([]); setVillages([]);
    if (!value.district_id) return;
    supabase.from('communes').select('*').eq('district_id', value.district_id).order('name_km').then(({ data }) => setCommunes(data || []));
  }, [value.district_id]);
  useEffect(() => {
    setVillages([]);
    if (!value.commune_id) return;
    supabase.from('villages').select('*').eq('commune_id', value.commune_id).order('name_km').then(({ data }) => setVillages(data || []));
  }, [value.commune_id]);

  return <div className="grid md:grid-cols-4 gap-3">
    <div><label className="label">ខេត្ត/រាជធានី</label><select className="input" value={value.province_id || ''} onChange={e => onChange({ province_id: e.target.value, district_id: null, commune_id: null, village_id: null })}><option value="">-- ជ្រើស --</option>{provinces.map(x => <option key={x.id} value={x.id}>{x.name_km}</option>)}</select></div>
    <div><label className="label">ស្រុក/ខណ្ឌ</label><select className="input" value={value.district_id || ''} disabled={!value.province_id} onChange={e => onChange({ district_id: e.target.value, commune_id: null, village_id: null })}><option value="">-- ជ្រើស --</option>{districts.map(x => <option key={x.id} value={x.id}>{x.name_km}</option>)}</select></div>
    <div><label className="label">ឃុំ/សង្កាត់</label><select className="input" value={value.commune_id || ''} disabled={!value.district_id} onChange={e => onChange({ commune_id: e.target.value, village_id: null })}><option value="">-- ជ្រើស --</option>{communes.map(x => <option key={x.id} value={x.id}>{x.name_km}</option>)}</select></div>
    <div><label className="label">ភូមិ</label><select className="input" value={value.village_id || ''} disabled={!value.commune_id} onChange={e => onChange({ village_id: e.target.value })}><option value="">-- ជ្រើស --</option>{villages.map(x => <option key={x.id} value={x.id}>{x.name_km}</option>)}</select></div>
    <div className="md:col-span-4"><label className="label">ព័ត៌មានបន្ថែម / ផ្ទះលេខ</label><input className="input" value={value.address || ''} onChange={e => onChange({ address: e.target.value })} placeholder="ឧ. ផ្ទះលេខ, ផ្លូវ, ក្រុម..." /></div>
  </div>;
}
