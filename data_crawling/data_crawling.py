import requests, json, time
from urllib.parse import quote
from bs4 import BeautifulSoup
import pandas as pd

# KADX 농식품 빅데이터 거래소에 있는 만개의레시피 데이터셋(https://kadx.co.kr/opmk/frn/pmumkproductDetail/PMU_79c6f1a4-56dd-492e-ad67-c5acba0304d2/5)에서 레시피 이름들만 추출해 리스트로 만들었음
csv_file_path = "./recipe_first_100.csv"
df = pd.read_csv(csv_file_path, low_memory=False)
column_name = "RCP_TTL"
column_data_list = df[column_name].tolist()

def safe_request(url, retries=3, delay=3):
    for attempt in range(retries):
        try:
            response = requests.get(url, timeout=10)  # 타임아웃 설정 (10초)
            if response.status_code == 200:
                return response
            else:
                print(f"HTTP error: {response.status_code}")
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}. Retrying... ({attempt + 1}/{retries})")
            time.sleep(delay)
    print(f"Failed to fetch {url} after {retries} attempts.")
    return None

def food_info(name):
    '''
    This function gives you food information for the given input.

    PARAMETERS
        - name(str): name of Korean food in Korean ex) food_info("김치찌개")
    RETURN
        - res(list): list of dict that containing info for some Korean food related to 'name'
            - res['name'](str): name of food
            - res['ingredients'](str): ingredients to make the food
            - res['recipe'](list[str]): contain recipe in order
    '''
    url = f"https://www.10000recipe.com/recipe/list.html?q={quote(name)}"
    response = safe_request(url)
    if response is None:  # 요청 실패 시 처리
        print(f"Failed to fetch {url} after multiple attempts.")
        return None
    
    if response.status_code == 200:
        html = response.text
        soup = BeautifulSoup(html, 'html.parser')
    else: 
        print("HTTP response error :", response.status_code)
        return
    
    food_list = soup.find_all(attrs={'class':'common_sp_link'})

    if not food_list:
        print(f"No food info found for {name}")
        return None
        
    food_id = food_list[0]['href'].split('/')[-1]
    new_url = f'https://www.10000recipe.com/recipe/{food_id}'
    new_response = requests.get(new_url)
    if new_response.status_code == 200:
        html = new_response.text
        soup = BeautifulSoup(html, 'html.parser')
    else : 
        print("HTTP response error :", response.status_code)
        return
    
    food_info = soup.find(attrs={'type':'application/ld+json'})

    #해당 음식 존재 여부 확인
    if not food_info:
        print(f"No food info found for {name}")
        return None

    result = json.loads(food_info.text)

    # Key 존재 여부 확인
    if 'recipeIngredient' not in result:
        print(f"'recipeIngredient' key missing for {name}")
        return None

    if 'recipeInstructions' not in result:
        print(f"'recipeInstructions' key missing for {name}")
        return None
    
    ingredient = ','.join(result['recipeIngredient'])
    recipe = [result['recipeInstructions'][i]['text'] for i in range(len(result['recipeInstructions']))]
    for i in range(len(recipe)):
        recipe[i] = f'{i+1}. ' + recipe[i]
    
    res = {
        'name': name,
        'ingredients': ingredient,
        'recipe': recipe
    }

    return res

# 레시피 정보를 저장할 리스트
food_info_list = []

# column_data_list의 각 레시피 이름을 food_info 함수에 넣고 결과를 저장
for i in range(len(column_data_list)):
    name = column_data_list[i]
    food_data = food_info(name)
    if food_data:  # food_info 함수가 None을 반환하지 않았다면
        food_info_list.append(food_data)
    time.sleep(2)

# 결과를 pandas DataFrame으로 변환
food_info_df = pd.DataFrame(food_info_list)

# DataFrame을 CSV로 저장
output_csv_path = './recipe_info1.csv'
food_info_df.to_csv(output_csv_path, index=False, encoding='utf-8-sig')

print(f"Recipe information saved to {output_csv_path}")