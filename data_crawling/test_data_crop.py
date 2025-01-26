import pandas as pd

# CSV 파일 경로
csv_file_path = "./recipe.csv"

# CSV 파일 읽기
df = pd.read_csv(csv_file_path)

# 처음 1000개 데이터 추출
df_first_1000 = df.head(100)

# 결과를 새로운 CSV로 저장
output_csv_path = "./recipe_first_100.csv"
df_first_1000.to_csv(output_csv_path, index=False, encoding='utf-8-sig')

print(f"First 1000 rows saved to {output_csv_path}")