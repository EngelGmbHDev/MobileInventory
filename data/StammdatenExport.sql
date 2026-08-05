
-- Queries für export Stammdaten

 SELECT s.BinCode AS 'Code', s.WhsCode AS 'Warehouse'  
 FROM OBIN s;

SELECT t0.ItemCode AS 'Code',( CASE WHEN t0.CodeBars IS NULL THEN '' ELSE t0.CodeBars END) AS 'BarCode' 
FROM OITM t0