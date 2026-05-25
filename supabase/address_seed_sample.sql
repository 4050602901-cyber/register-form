-- Sample Cambodia address seed. Replace/extend with full NCDD gazetteer export when needed.
insert into public.provinces (id, code, name_km, name_en) values
('01','01','បន្ទាយមានជ័យ','Banteay Meanchey'),
('02','02','បាត់ដំបង','Battambang'),
('03','03','កំពង់ចាម','Kampong Cham'),
('04','04','កំពង់ឆ្នាំង','Kampong Chhnang'),
('05','05','កំពង់ស្ពឺ','Kampong Speu'),
('06','06','កំពង់ធំ','Kampong Thom'),
('07','07','កំពត','Kampot'),
('08','08','កណ្ដាល','Kandal'),
('09','09','កោះកុង','Koh Kong'),
('10','10','ក្រចេះ','Kratie'),
('11','11','មណ្ឌលគិរី','Mondulkiri'),
('12','12','ភ្នំពេញ','Phnom Penh'),
('13','13','ព្រះវិហារ','Preah Vihear'),
('14','14','ព្រៃវែង','Prey Veng'),
('15','15','ពោធិ៍សាត់','Pursat'),
('16','16','រតនគិរី','Ratanakiri'),
('17','17','សៀមរាប','Siem Reap'),
('18','18','ព្រះសីហនុ','Preah Sihanouk'),
('19','19','ស្ទឹងត្រែង','Stung Treng'),
('20','20','ស្វាយរៀង','Svay Rieng'),
('21','21','តាកែវ','Takeo'),
('22','22','ឧត្តរមានជ័យ','Oddar Meanchey'),
('23','23','កែប','Kep'),
('24','24','ប៉ៃលិន','Pailin'),
('25','25','ត្បូងឃ្មុំ','Tboung Khmum')
on conflict (id) do update set name_km=excluded.name_km, name_en=excluded.name_en;

-- Phnom Penh sample hierarchy
insert into public.districts (id, province_id, code, name_km, name_en) values
('1201','12','1201','ចំការមន','Chamkar Mon'),
('1202','12','1202','ដូនពេញ','Doun Penh'),
('1208','12','1208','មានជ័យ','Mean Chey')
on conflict (id) do update set name_km=excluded.name_km;

insert into public.communes (id, province_id, district_id, code, name_km, name_en) values
('120101','12','1201','120101','ទន្លេបាសាក់','Tonle Basak'),
('120201','12','1202','120201','ផ្សារថ្មីទី១','Phsar Thmei Ti Muoy'),
('120801','12','1208','120801','ចាក់អង្រែលើ','Chak Angrae Leu')
on conflict (id) do update set name_km=excluded.name_km;

insert into public.villages (id, province_id, district_id, commune_id, code, name_km, name_en) values
('12010101','12','1201','120101','12010101','ភូមិ១','Phum 1'),
('12020101','12','1202','120201','12020101','ភូមិ១','Phum 1'),
('12080101','12','1208','120801','12080101','ភូមិ១','Phum 1')
on conflict (id) do update set name_km=excluded.name_km;
