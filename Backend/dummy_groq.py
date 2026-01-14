from langchain_groq import ChatGroq
import os

print("Hello")



GROQ_API_KEY = ""

def get_groq_llm(temperature=0.2):
    return ChatGroq(
        model="llama3-70b-8192",
        temperature=temperature,
        groq_api_key=GROQ_API_KEY
    )


model = ChatGroq(
    model="llama-3.1-8b-instant",
    temperature=0.0,
    max_retries=2,
    groq_api_key=GROQ_API_KEY
    # other params...
)

messages = [
    ("system", "You are a helpful translator. Translate the user sentence to French."),
    ("human", "I love programming."),
]
y = model.invoke(messages)
print(y.content)

print("hello")

# response = get_groq_llm().invoke("Explain LangChain in one sentence.")
# print(response.content)