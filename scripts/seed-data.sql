-- Sample Service Providers for iTRUSH
-- This file contains sample data for testing the application
-- Run this in your Supabase SQL Editor

-- Insert sample service providers in different areas of Kampala
INSERT INTO service_providers (name, contact, area, location_lat, location_lon, status) VALUES
('Kampala Central Waste Services', 'central@kcws.co.ug', 'Central Division', 0.3136, 32.5811, 'active'),
('Kawempe Waste Management', 'kawempe@kwm.co.ug', 'Kawempe Division', 0.3676, 32.5552, 'active'),
('Makindye Clean Services', 'makindye@mcs.co.ug', 'Makindye Division', 0.2833, 32.5981, 'active'),
('Nakawa Waste Collection', 'nakawa@nwc.co.ug', 'Nakawa Division', 0.3324, 32.6190, 'active'),
('Rubaga Sanitation Ltd', 'rubaga@rsl.co.ug', 'Rubaga Division', 0.3024, 32.5547, 'active'),
('De Waste Uganda', 'info@dewaste.co.ug', 'Greater Kampala', 0.3476, 32.5825, 'active'),
('Nabugabo Updeal', 'contact@nabugabo.co.ug', 'Greater Kampala', 0.3200, 32.5900, 'active')
ON CONFLICT DO NOTHING;

-- Note: This uses ON CONFLICT DO NOTHING to prevent duplicate insertions if run multiple times
