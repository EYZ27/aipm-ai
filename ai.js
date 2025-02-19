import express from 'express';
import cors from 'cors';
import { OpenAI } from 'openai';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// dotenv 설정 초기화
dotenv.config();

const app = express();

app.options('*', cors()); // Preflight 요청 허용

// CORS 설정
app.use(cors({
    origin: ['https://eyz27.github.io/'],  // 프론트엔드 주소
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept'],
    credentials: true
}));

app.use(express.json());

// Swagger 설정 수정
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'AIPM API',
            version: '1.0.0',
            description: 'AIPM API with OpenAI integration'
        },
        servers: [
            {
                url: 'http://localhost:8080'
            }
        ]
    },
    apis: ['./ai.js']
};


const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// swagger.json 파일로 저장
fs.writeFileSync("./swagger.json", JSON.stringify(swaggerSpec, null, 2));

// OpenAI API 클라이언트 설정
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// 모듈 1
// 세부 일정 생성
async function categorizeType(projectType) {
    const prompt = `Identify the category of the user's input and return the corresponding category number.
    
    * category
    1. 로고/명함 디자인
    2. 리플렛/홍보물/포스터 디자인
    3. 기업/서비스/IR 소개서 및 PPT 디자인
    4. SNS/썸네일/상세페이지 디자인
    5. 웹/모바일 디자인
    6. 기타`

    try {
        console.time('OpenAI API 호출 시간');
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: prompt },
                { role: 'user', content: projectType },
            ],
            response_format: { 
                type: "json_schema",
                json_schema: {
                    name: "category_num",
                    strict: true, 
                    description: "카테고리를 분류합니다.",
                    schema: {
                        type: "object",
                        properties: {
                            category_num: {
                                type: "integer",
                                description: "사용자의 입력이 속하는 카테고리의 번호입니다."
                            }
                        },
                        required: ["category_num"],
                        additionalProperties: false
                    }
                }
            },
        });
        console.timeEnd('OpenAI API 호출 시간');

        const category_num = JSON.parse(response.choices[0].message.content);

        return category_num.category_num;
    } catch (error) {
        console.error("Error:", error);
        throw error;
    }
};


async function getAISchedule(projectType, duration, category_num) {
    const duration_ex = {
        1: `(예시) 로고/명함 디자인 프로젝트 - 31일
주말 제외 세부 기간
- 킥오프 미팅: 1일
- 기획 및 리서치: 3일
- 로고 컨셉 개발: 4일
- 방향성 논의 미팅: 1일
- 피드백 반영 및 수정: 3일
- 명함 디자인 제작: 4일
- 디자인 검토 미팅: 1일
- 최종 디자인 확정 및 파일 정리: 5일
- 최종 승인 미팅: 1일`,
        
        2: `(예시) 리플렛/홍보물/포스터 디자인 프로젝트 - 48일
주말 제외 세부 기간
- 킥오프 미팅: 1일
- 기획 및 콘텐츠 구성: 5일
- 디자인 시안 제작: 5일
- 디자인 검토 미팅: 1일
- 피드백 반영 및 수정: 5일
- 최종 디자인 미팅: 1일
- 인쇄 파일 제작 및 검토: 5일
- 인쇄 준비 미팅: 1일
- 인쇄 및 최종 배포: 10일`,
        
        3: `(예시) 기업/서비스/IR 소개서 및 PPT 디자인 프로젝트 - 50일
주말 제외 세부 기간
- 킥오프 미팅: 1일
- 자료 수집 및 기획: 5일
- PPT 슬라이드 레이아웃 제작: 5일
- 디자인 검토 미팅: 1일
- 피드백 반영 및 수정: 5일
- 최종 검토 미팅: 1일
- 최종 디자인 및 애니메이션 추가: 10일
- 발표 준비 미팅: 1일
- 최종 자료 정리 및 파일 제공: 7일`,
        
        4: `(예시) SNS/썸네일/상세페이지 디자인 프로젝트 - 34일
주말 제외 세부 기간
- 킥오프 미팅: 1일
- 브랜드 분석 및 디자인 방향 설정: 3일
- 초기 디자인 시안 제작: 4일
- 디자인 검토 미팅: 1일
- 피드백 반영 및 수정: 3일
- 템플릿 제작 및 디자인 확정: 4일
- 최종 승인 미팅: 1일
- 최종 디자인 패키징 및 전달: 7일`,
        
        5: `(예시) 웹/모바일 디자인 (UI/UX 포함) 프로젝트 - 49일
주말 제외 세부 기간
- 킥오프 미팅: 1일
- 기획 및 UX 리서치: 5일
- 디자인 스타일 가이드 설정: 5일
- 디자인 검토 미팅: 1일
- 메인 및 서브 페이지 UI 디자인: 10~15일
- 프로토타입 제작 및 테스트: 7~10일
- 사용자 테스트 검토 미팅: 1일
- 최종 디자인 확정 및 가이드 문서 정리: 5~7일
- 최종 승인 미팅: 1일`,

        6: `(예시) 글로벌 디자인 프로젝트 - 49일
주말 제외 세부 기간
- 킥오프 미팅: 1일
- 기획 및 리서치: 3~7일
- 컨셉 개발 및 스타일 가이드 제작: 4~7일
- 디자인 시안 제작: 5~10일
- 디자인 검토 미팅: 1일
- 피드백 반영 및 수정: 3~7일
- 프로토타입 제작 또는 최종 디자인 확정: 5~10일
- 최종 검토 미팅: 1일
- 파일 정리 및 인쇄/출력/개발팀 전달 준비: 3~7일
- 최종 승인 미팅 및 프로젝트 마무리: 1일`
        }

    const userInput = `${projectType}, overall period ${duration}`;

    const prompt = `You are an AI assistant for a Project Manager, responsible for planning detailed schedules for design projects.

When given the project type and overall period, create a detailed schedule with a balanced distribution within the given timeframe. 
You must have a strong understanding of design project characteristics to ensure practical scheduling. 
The schedule is shared between the client and the designer, so only common activities or milestones agreed upon by both parties should be included.

Scheduling rules:
1. Meetings: Start and end dates must be the same.
2. Non-overlapping schedules: Tasks and meetings must not overlap.
3. Weekdays only: All tasks and meetings should be scheduled only on weekdays (월–금).
4. Handling weekends and holidays:
   - If a task’s duration (start date ~ end date) overlaps with a weekend or a Korean national holiday, adjust the schedule so that the total timeline reflects only working days.
   - This may involve extending the task duration or shifting meeting dates to the next workday.

Formatting and content guidelines:
- Date format: Output dates in the format "yyyy-mm-dd".
- Description Language: The description should be written in Korean, with clear and detailed explanations.
- Keywords for reference: Consider the following key milestones when creating the schedule:
  - 킥오프 미팅, 1차 시안, 2차 시안, 3차 시안, 피드백 미팅
- If additional necessary schedules arise, include them, but limit the detailed schedule to a maximum of 10 items.

Adjusting detailed periods:  
Below is an example of detailed periods for reference.  
Use this as a guideline, but adjust the schedule flexibly based on the given project period and characteristics to create a well-balanced and realistic detailed schedule.  

<duration example>
${duration_ex[category_num]}
</duration example>

<output example>
[
    {
    "name": "킥오프 미팅",
    "start_date": "2025-01-02",
    "end_date": "2025-01-02",
    "days": "1일",
    "desc": "프로젝트 시작을 위한 킥오프 미팅을 진행합니다. 이 미팅에서는 프로젝트 목표, 일정, 그리고 기초 정보를 논의합니다."
    },
    ...
]
</output example>
`;

    try {
        console.time('OpenAI API 호출 시간');
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: prompt },
                { role: 'user', content: userInput },
            ],
            response_format: { 
                type: "json_schema",
                json_schema: {
                    name: "schedules",
                    strict: true, 
                    description: "일정 목록을 반환합니다.",
                    schema: {
                        type: "object",
                        properties: {
                            schedules: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        name: { type: "string" },
                                        start_date: { type: "string" },
                                        end_date: { type: "string" },
                                        days: { type: "string" },
                                        desc: { type: "string" }
                                    },
                                    required: ["name", "start_date", "end_date", "days", "desc"],
                                    additionalProperties: false
                                }
                            }
                        },
                        required: ["schedules"],
                        additionalProperties: false
                    }
                }
            },
        });
        console.timeEnd('OpenAI API 호출 시간');

        console.time('응답 파싱 시간');
        const parsedResponse = JSON.parse(response.choices[0].message.content);
        console.timeEnd('응답 파싱 시간');
        return parsedResponse;
    } catch (error) {
        console.error("Error:", error);
        throw error;
    }
}

// 모듈 2
// 레퍼런스 기반 이미지 생성

// 모듈 2-1 레퍼런스 분석
// Function to encode the image in Base64
function encodeImage(imagePath) {
    const imageBuffer = fs.readFileSync(imagePath);
    return imageBuffer.toString('base64');
}

// Function to check image existence
function encodeExistingImages(filePaths) {
    const result = {};
    
    filePaths.forEach((filePath, index) => {
        const key = `image${index + 1}`;
        result[key] = fs.existsSync(filePath) ? encodeImage(filePath) : null;
    });
    
    return result;
    }

// Function to get result of image to text
async function getReferenceAnalysis(imageURLs) {
    // imageUrls = ["ref1.png", "ref2.png", "ref3.png"]; // 예제
    const encodedImages = encodeExistingImages(imageURLs);

    const prompt = `You are an expert in describing the design elements of an image.
You must explain each image in detail as if you were describing it to a visually impaired person.

Step 1. Classify the image into one of the following categories:
- Photorealistic image
- Graphic image
- Combination of Photorealistic and Graphic

Step 2. Describe images in the following format.

If the image is a Photorealistic image:
- Image Type: Photorealistic image
- Background: (Description of characteristics and elements of background)
- Element List:
  - (Name of Element): (Description of contents, color combination or monotone, and placement)
  - (Name of Element): (Description of contents, color combination or monotone, and placement)
  - ...

If the image is a Graphic image:
- Image Type: Graphic image
- Background: (Description of the color and texture of background)
- Element List:
  - (Name of Element): (Description of shape with quantity, lines with quantity, and placement)
  - (Name of Element): (Description of shape with quantity, lines with quantity, and placement)
  - ...

If the image is a Combination of Photorealistic and Graphic:
- Image Type: Combination of Photorealistic and Graphic
- Background: (Description of characteristics and elements of background)
- Element List:
  - (Name of Photorealistic Element): (Description of contents, color combination or monotone, and placement)
  - (Name of Graphic Element): (Description of shape with quantity, lines with quantity, and placement)
  - ...

If any element contains text, add the following details in the element list:
  - Text Element: (Description of contents, font, weight, shape, and placement)`;

    try {
        console.time('OpenAI API 호출 시간');
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
            {
                role: "user",
                content: [
                    { type: "text", text: prompt },
                    ...Object.keys(encodedImages).map(key => ({
                        type: "image_url",
                        image_url: {
                            url: `data:image/png;base64,${encodedImages[key]}`,
                        }
                    }))
                    ],
                }
            ],
        });

        console.timeEnd('OpenAI API 호출 시간');

        const analyzedText = response.choices[0].message.content;

        console.log(analyzedText);

        return analyzedText;
    } catch (error) {
        console.error("Error:", error);
        throw error;
    }
}

// 모듈 2-2 요청사항 분석 및 프롬프트 생성
async function getAnayzedReq(projectType, analyzedText, userInput) {
    const prompt = `You are tasked with compiling an image creation directive from the image descriptions and user's requests.

Perform the following steps:
Step 1: Identify the common elements from the image descriptions.
Step 2: Incorporate any necessary modifications based on the user’s requests.
Step 3: Write the description for a single image using short sentences or phrases, listed on separate lines like bullet points. Avoid unnecessary embellishments or lengthy wording.

The description must include the following:

- Image type (e.g., photorealistic, graphic, or a combination of photorealistic and graphic)
- Types of elements (e.g., contents, text, shapes, lines, etc.) and their quantities
- A brief but precise explanation of each element

Please ensure compliance with the safety system by avoiding copyright infringement, refraining from referencing specific entities, and omitting subjective or abstract expressions.
Please write the prompt content only, without any additional instructions.

<EXAMPLE>
A combination of a photorealistic image and a graphic text poster.
Three beverage glasses featuring watermelon juice, pineapple juice, and lemonade.
A coastal setting in the background.
Title text: 'Summer Beverage'
Subtitle text: 'Refresh Your Summer'
Each beverage is labeled with its name: Watermelon Juice, Pineapple Juice, and Lemonade.
Each beverage is priced at 5.0.
An explanation text for each beverage.
</EXAMPLE>

User's design project: ${projectType}
Description of images:
${analyzedText}`;

    try {
        console.time('OpenAI API 호출 시간');
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: prompt },
                { role: "user", content: userInput }
            ],
        });

        console.timeEnd('OpenAI API 호출 시간');

        const analyzedReq = response.choices[0].message.content;

        console.log(analyzedReq);

        return analyzedReq;
    } catch (error) {
        console.error("Error:", error);
        throw error;
    }
}

// 모듈 2-3 이미지 생성
async function getAIReference(analyzedReq) {
    const model = 'dall-e-3';
    const size = '1024x1024';
    const response_format = 'b64_json'; // or url

    try {
        const response = await openai.images.generate({
            model: model,
            prompt: analyzedReq,
            size: size,
            response_format: response_format
        })

        if (response_format == "url") {
            const newImageURL = response.data[0].url;
            const urlResponse = { 
                format: 'url',
                image_data: newImageURL
            }
            return urlResponse;
        } else {
            const imageBinaryData = response.data[0].b64_json;
            const binaryResponse = {
                format: 'base64',
                image_data: imageBinaryData
            }

            // 이미지 결과 확인 위한 저장 코드 (추후 삭제)
            const buffer = Buffer.from(imageBinaryData, "base64");
            fs.writeFileSync(path.resolve(`response/Reference-${Date.now()}.png`), buffer);
            // 이미지 결과 확인 위한 저장 코드

            return binaryResponse;
        }
    } catch (err) {
        console.log("OpenAI DALL-E-3 API 호출 에러발생:", err);
    }
}

// 모듈 3 애셋 추천 모듈

async function getCuratedAssets(projectType, keywords) {
    
    const tags_json = JSON.parse(fs.readFileSync('nullz_tags.json', 'utf-8'));
    console.log(tags_json.tags);

    const prompt = `Role: Recommend search terms for finding suitable images.
Task:
Generate a list of recommended search terms from the provided search term list, considering the project type and keyword list. 
The recommended search terms should be optimized for finding images that align with the desired style and concepts, which are derived from commonalities found within the project type and keyword list.
All recommended terms, consisting of 3 to 8 terms, must be present in the original search term list.

<Project type>
${projectType}
</Project type>

<Search term list>
${tags_json.tags}
</Search term list>
`;

    try {
        console.time('OpenAI API 호출 시간');
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: prompt },
                { role: "user", content: `<Keyword list> ${keywords}` }
            ],
            response_format: { 
                type: "json_schema",
                json_schema: {
                    name: "curated_terms",
                    strict: true, 
                    description: "추천 검색어를 반환합니다.",
                    schema: {
                        type: "object",
                        properties: {
                            curated_terms: {
                                type: "array",
                                items: {
                                    type: "string",
                                    additionalProperties: false
                                }
                            }
                        },
                        required: ["curated_terms"],
                        additionalProperties: false
                    }
                }
            },
        });

        console.timeEnd('OpenAI API 호출 시간');

        const curatedTerms = JSON.parse(response.choices[0].message.content).curated_terms;

        console.log(curatedTerms);

        return curatedTerms;
    } catch (error) {
        console.error("Error:", error);
        throw error;
    }
}

// 모듈 4 시안 설명 모듈
async function getDraftExplain(imageURL, projectType, keywords) {
    const encodedImage = encodeImage(imageURL);

    const prompt = `Role: AI assistant to help designers write reports on their design drafts.

Task: Write an appropriate description of the design draft for the report in KOREAN.
Write the description as if the designer is explaining their own work.
Avoid using unnecessary subjects (such as "로고 디자인은" or "이 시안은") in the description because the reader already knows which image is being referred to.


Input:
- Design Draft: The actual design draft (image, mockup, prototype, etc.)
- Project Type: The type of project (e.g., website, mobile app, logo, poster, etc.)
- Direction Keywords: Keywords that represent the overall direction and goals of the project (e.g., modern, minimalist, playful, professional, etc.)

<ProjectType>
${projectType}

<Direction Keywords>
${keywords}

<Example>
보라색 톤과 미니멀리즘, 그리고 우주적인 감성을 결합하여 현대적인 그래픽 아트 스타일을 반영하였습니다. 부드러운 곡선과 원형 패턴이 조화롭게 어우러져 시각적인 균형을 이루고 있습니다.`;

    try {
        console.time('OpenAI API 호출 시간');
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        { type: "image_url", image_url: { url: `data:image/png;base64,${encodedImage}`} }
                    ],
                }
            ],
        })

        console.timeEnd('OpenAI API 호출 시간');

        const explainText = response.choices[0].message.content;

        console.log(explainText);

        return explainText;
    } catch (error) {
        console.error("Error:", error);
        throw error;
    }
}

// 모듈 5 시안 수정 모듈
// 모듈 5-1 시안 분석 모듈
async function getDraftAnalysis(imageURL) {

    // const imageURL = 'images/sian1.png';
    const encodedImage = encodeImage(imageURL);

    const prompt = `You are an expert in describing the design elements of an image.
If a single image is composed of multiple images, a description should be provided for each individual image.
You must explain an image in detail as if you were describing it to a visually impaired person.

Step 1. Classify the image into one of the following categories:
- Photorealistic image
- Graphic image
- Combination of Photorealistic and Graphic

Step 2. Describe images in the following format.

If the image is a Photorealistic image:
- Image Type: Photorealistic image
- Background: (Description of characteristics and elements of background)
- Element List:
  - (Name of Element): (Description of contents, color combination or monotone, and placement)
  - (Name of Element): (Description of contents, color combination or monotone, and placement)
  - ...

If the image is a Graphic image:
- Image Type: Graphic image
- Background: (Description of the color and texture of background)
- Element List:
  - (Name of Element): (Description of shape with quantity, lines with quantity, and placement)
  - (Name of Element): (Description of shape with quantity, lines with quantity, and placement)
  - ...

If the image is a Combination of Photorealistic and Graphic:
- Image Type: Combination of Photorealistic and Graphic
- Background: (Description of characteristics and elements of background)
- Element List:
  - (Name of Photorealistic Element): (Description of contents, color combination or monotone, and placement)
  - (Name of Graphic Element): (Description of shape with quantity, lines with quantity, and placement)
  - ...

If any element contains text, add the following details in the element list:
  - Text Element: (Description of contents, font, weight, shape, and placement)`;

    try {
        console.time('OpenAI API 호출 시간');
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        { type: "image_url", image_url: { url: `data:image/png;base64,${encodedImage}`} }
                    ],
                }
            ],
        })

        console.timeEnd('OpenAI API 호출 시간');

        const analyzedText = response.choices[0].message.content;

        console.log(analyzedText);

        return analyzedText;
    } catch (error) {
        console.error("Error:", error);
        throw error;
    }
}

// 모듈 5-2 요청사항 분석 및 프롬프트 생성
async function getDraftReq(explanation, projectType, analyzedText, userInput) {

    const prompt = `You are tasked with compiling an image creation directive from the image descriptions and user's requests.
Based on the designer's explanation and user's requests, consider how to accommodate the user's requests in creating the image.
If the user requests a change to specific text, replace the existing text in the image description with the new text.

Perform the following steps:
Step 1: If the user's request is unclear and abstract, transform it into a request with specific design directions.
Step 2: Decide, as a professional, whether to modify the design direction, change design elements, or do both.
Step 3: Write the description for a single image using short sentences or phrases, listed on separate lines like bullet points. Avoid unnecessary embellishments or lengthy wording.

The description must include the following:

- Image type (e.g., photorealistic, graphic, or a combination of photorealistic and graphic)
- Types of elements (e.g., contents, text, shapes, lines, etc.) and their quantities
- A brief but precise explanation of each element

Please ensure compliance with the safety system by avoiding copyright infringement, refraining from referencing specific entities, and omitting subjective or abstract expressions.
Please write the prompt content only, without any additional instructions.

<EXAMPLE>
A combination of a photorealistic image and a graphic text poster.
Three beverage glasses featuring watermelon juice, pineapple juice, and lemonade.
A coastal setting in the background.
Title text: 'Summer Beverage'
Subtitle text: 'Refresh Your Summer'
Each beverage is labeled with its name: Watermelon Juice, Pineapple Juice, and Lemonade.
Each beverage is priced at 5.0.
An explanation text for each beverage.
</EXAMPLE>

User's design project: ${projectType}

Image description:
${analyzedText}

Designer's explanation: ${explanation}`

    try {
        console.time('OpenAI API 호출 시간');
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: prompt },
                { role: "user", content: userInput }
            ],
        });

        console.timeEnd('OpenAI API 호출 시간');

        const analyzedReq = response.choices[0].message.content;

        console.log(analyzedReq);

        return analyzedReq;
    } catch (error) {
        console.error("Error:", error);
        throw error;
    }
}

// 모듈 5-3 시안 이미지 생성 모듈
async function getAIDraft(analyzedReq) {
    const model = 'dall-e-3';
    const size = '1024x1024';
    const response_format = 'b64_json'; // or url

    try {
        const response = await openai.images.generate({
            model: model,
            prompt: analyzedReq,
            size: size,
            response_format: response_format
        })

        if (response_format == "url") {
            const newImageURL = response.data[0].url;
            const urlResponse = { 
                format: 'url',
                image_data: newImageURL
            }
            return urlResponse;
        } else {
            const imageBinaryData = response.data[0].b64_json;
            const binaryResponse = {
                format: 'base64',
                image_data: imageBinaryData
            }
            
            // 이미지 결과 확인 위한 저장 코드 (추후 삭제)
            const buffer = Buffer.from(imageBinaryData, "base64");
            fs.writeFileSync(path.resolve(`response/Reference-${Date.now()}.png`), buffer);
            // 이미지 결과 확인 위한 저장 코드

            return binaryResponse;
        }
    } catch (err) {
        console.log("OpenAI DALL-E-3 API 호출 에러발생:", err);
    }
}

/////////////////////////////////////////////////////////////////////////////////

/**
 * @swagger
 * /api/ai_schedule:
 *   post:
 *     summary: 세부 일정 생성 모듈
 *     description: 프로젝트 종류, 전체 기간에 따라 세부 일정을 생성합니다.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectType
 *               - duration
 *             properties:
 *               projectType:
 *                 type: string
 *                 description: 프로젝트 종류
 *                 example: 브랜드 시각화 로고 디자인
 *               duration:
 *                 type: string
 *                 description: 프로젝트 전체 기간
 *                 example: 2025-01-02~2025-02-28
 *     responses:
 *       200:
 *         description: 성공적인 분석 결과
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     schedules:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                             description: 일정명
 *                             example: 킥오프 미팅
 *                           start_date:
 *                             type: string
 *                             format: date
 *                             description: 시작 날짜
 *                             example: 2025-01-02
 *                           end_date: 
 *                             type: string
 *                             format: date
 *                             description: 종료 날짜
 *                             example: 2025-01-02
 *                           days:
 *                             type: string
 *                             description: 기간
 *                             example: 1일
 *                           desc:
 *                             type: string
 *                             description: 일정 설명
 *                             example: 프로젝트 시작을 위한 킥오프 미팅을 진행합니다. 이 미팅에서는 프로젝트 목표, 일정, 그리고 기초 정보를 논의합니다.
 *                         required:
 *                           - name
 *                           - start_date
 *                           - end_date
 *                           - duration
 *                           - desc
 *                       description: 일정 리스트
 *       400:
 *         description: 잘못된 요청
 *       500:
 *         description: 서버 오류
 */

app.post('/api/ai_schedule', async (req, res) => {
    try {
        const { projectType, duration } = req.body;
        
        if (!projectType || !duration) {
            return res.status(400).json({
                success: false,
                error: '프로젝트 종류와 기간 데이터가 필요합니다.'
            });
        }

        const category_num = await categorizeType(projectType);

        const result = await getAISchedule(projectType, duration, category_num);
        // console.log(result.schedules[0].name);
        // result.schedules[0].start_date
        // result.schedules[0].end_date
        // result.schedules[0].desc
        // 필요한 것만 가져다 쓰시면 됩니다.
        
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            error: '서버 처리 중 오류가 발생했습니다.'
        });
    }
});

/**
 * @swagger
 * /api/ai_reference_img:
 *   post:
 *     summary: 레퍼런스 AI 이미지 생성 모듈
 *     description: 프로젝트 종류와 사용자 요청사항에 따라, 레퍼런스 이미지와 관련된 이미지를 생성합니다.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - imageURLs
 *               - projectType
 *             properties:
 *               imageURLs:
 *                 type: array
 *                 description: 이미지 주소 배열
 *                 items:
 *                   type: string
 *                 example:
 *                   - "images/ref1.png"
 *                   - "images/ref2.png"
 *                   - "images/ref3.png"
 *               projectType:
 *                 type: string
 *                 description: 프로젝트 종류
 *                 example: 브랜드 시각화 로고 디자인
 *               userInput:
 *                 type: string
 *                 description: 사용자 요청사항
 *                 example: 색깔을 보라색으로 바꿔주세요.
 *     responses:
 *       200:
 *         description: 성공적인 생성
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     format:
 *                       type: string
 *                       description: 포맷 종류 (url or base64)
 *                       example: base64
 *                     image_data:
 *                       type: string
 *                       description: 포맷에 따른 출력 내용
 *       400:
 *         description: 잘못된 요청
 *       500:
 *         description: 서버 오류
 */

app.post('/api/ai_reference_img', async (req, res) => {
    try {
        const { imageURLs, projectType, userInput } = req.body;
        
        if (!imageURLs || !projectType) {
            return res.status(400).json({
                success: false,
                error: '이미지 주소, 프로젝트 종류, 사용자 요청사항 입력 데이터가 필요합니다.'
            });
        }

        if (!userInput) {
            userInput = '';
        }

        const analyzedText = await getReferenceAnalysis(imageURLs);

        const analyzedReq = await getAnayzedReq(projectType, analyzedText, userInput);

        const result = await getAIReference(analyzedReq);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            error: '서버 처리 중 오류가 발생했습니다.'
        });
    }
});

/** 
 * @swagger
 * /api/ai_curated_assets:
 *   post:
 *     summary: 애셋 추천 검색어 생성 모듈
 *     description: 프로젝트 방향성 키워드를 바탕으로 애셋 추천 검색어를 도출합니다.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - imageURLs
 *               - projectType
 *               - keywords
 *             properties:
 *               imageURLs:
 *                 type: array
 *                 description: 이미지 주소 배열
 *                 items:
 *                   type: string
 *                 example:
 *                   - "images/ref1.png"
 *                   - "images/ref2.png"
 *                   - "images/ref3.png"
 *               projectType:
 *                 type: string
 *                 description: 프로젝트 종류
 *                 example: 브랜드 시각화 로고 디자인
 *               keywords:
 *                 type: string
 *                 description: 방향성 키워드
 *                 example: 인플루언서, 트렌디한, 화보촬영, 플랫폼
 *     responses:
 *       200:
 *         description: 성공적인 생성
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   description: 추천 검색어 배열
 *                   items:
 *                     type: string
 *                   example: ["프로필사진", "트렌드", "플랫폼"]
 *       400:
 *         description: 잘못된 요청
 *       500:
 *         description: 서버 오류
 */

app.post('/api/ai_curated_assets', async (req, res) => {
    try {
        const { imageURLs, projectType, keywords } = req.body;
        
        if (!imageURLs || !projectType || !keywords) {
            return res.status(400).json({
                success: false,
                error: '이미지 주소 배열, 프로젝트 종류, 방향성 키워드 데이터가 필요합니다.'
            });
        }

        // const analyzedText = await getReferenceAnalysis(imageURLs);

        const curatedTerms = await getCuratedAssets(projectType, keywords);

        res.json({
            success: true,
            data: curatedTerms
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            error: '서버 처리 중 오류가 발생했습니다.'
        });
    }
});

/** 
 * @swagger
 * /api/ai_draft_explain:
 *   post:
 *     summary: AI 시안 설명 생성 모듈
 *     description: 시안 이미지와 방향성 키워드를 바탕으로, AI 설명을 생성합니다.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - imageURL
 *               - projectType
 *               - keywords
 *             properties:
 *               imageURL:
 *                 type: string
 *                 description: 시안 이미지 주소
 *                 example: images/sian1.png
 *               projectType:
 *                 type: string
 *                 description: 프로젝트 종류
 *                 example: 브랜드 시각화 로고 디자인
 *               keywords:
 *                 type: string
 *                 description: 방향성 키워드
 *                 example: 인플루언서, 트렌디한, 화보촬영, 플랫폼
 *     responses:
 *       200:
 *         description: 성공적인 생성
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: string
 *                   description: 시안에 대한 설명
 *                   example: M을 형상화한 흰색의 미니멀한 로고입니다. 로고에 곡선의 형태를 많이 사용하였습니다.
 *       400:
 *         description: 잘못된 요청
 *       500:
 *         description: 서버 오류
 */

app.post('/api/ai_draft_explain', async (req, res) => {
    try {
        const { imageURL, projectType, keywords } = req.body;
        
        if (!imageURL || !projectType || !keywords) {
            return res.status(400).json({
                success: false,
                error: '이미지 주소, 시안 설명, 프로젝트 종류, 사용자 요청사항 입력 데이터가 필요합니다.'
            });
        }

        const result = await getDraftExplain(imageURL, projectType, keywords);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            error: '서버 처리 중 오류가 발생했습니다.'
        });
    }
});

/** 
 * @swagger
 * /api/ai_draft_img:
 *   post:
 *     summary: AI 시안 이미지 생성 모듈
 *     description: 프로젝트 종류와 사용자 요청사항에 따라, AI 시안 이미지를 생성합니다.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - imageURL
 *               - explanation
 *               - projectType
 *             properties:
 *               imageURL:
 *                 type: string
 *                 description: 시안 이미지 주소
 *                 example: images/sian1.png
 *               explanation:
 *                 type: string
 *                 description: 시안에 대한 설명
 *                 example: M을 형상화한 흰색의 미니멀한 로고입니다. 로고에 곡선의 형태를 많이 사용하였습니다.
 *               projectType:
 *                 type: string
 *                 description: 프로젝트 종류
 *                 example: 브랜드 시각화 로고 디자인
 *               userInput:
 *                 type: string
 *                 description: 사용자 요청사항
 *                 example: 색깔을 보라색으로 바꿔주세요.
 *     responses:
 *       200:
 *         description: 성공적인 생성
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     format:
 *                       type: string
 *                       description: 포맷 종류 (url or base64)
 *                       example: base64
 *                     image_data:
 *                       type: string
 *                       description: 포맷에 따른 출력 내용
 *       400:
 *         description: 잘못된 요청
 *       500:
 *         description: 서버 오류
 */

app.post('/api/ai_draft_img', async (req, res) => {
    try {
        const { imageURL, explanation, projectType, userInput } = req.body;
        
        if (!imageURL || !explanation || !projectType) {
            return res.status(400).json({
                success: false,
                error: '이미지 주소, 시안 설명, 프로젝트 종류, 사용자 요청사항 입력 데이터가 필요합니다.'
            });
        }

        if (!userInput) {
            userInput = '';
        }

        const analyzedText = await getDraftAnalysis(imageURL);

        const analyzedReq = await getDraftReq(explanation, projectType, analyzedText, userInput);

        const result = await getAIDraft(analyzedReq);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            error: '서버 처리 중 오류가 발생했습니다.'
        });
    }
});


// 서버 시작
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
    console.log(`Swagger 문서: http://localhost:${PORT}/api-docs`);
});