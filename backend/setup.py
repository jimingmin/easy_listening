from setuptools import find_packages, setup


INSTALL_REQUIRES = [
    "fastapi>=0.114,<1.0",
    "uvicorn[standard]>=0.30,<1.0",
    "pydantic>=2.8,<3.0",
    "SQLAlchemy>=2.0.32,<3.0",
    "PyMySQL>=1.1.1,<2.0",
    "python-dotenv>=1.0,<2.0",
]

DEV_REQUIRES = [
    "pytest>=8.3,<9.0",
    "httpx>=0.27,<1.0",
]


setup(
    name="easy-listening-backend",
    version="0.1.0",
    description="Easy Listening backend service for real resource data",
    packages=find_packages(),
    python_requires=">=3.11",
    install_requires=INSTALL_REQUIRES,
    extras_require={"dev": DEV_REQUIRES},
)
