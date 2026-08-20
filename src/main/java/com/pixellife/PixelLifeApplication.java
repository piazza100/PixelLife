package com.pixellife;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@MapperScan("com.pixellife.mapper")
@SpringBootApplication
public class PixelLifeApplication {
    public static void main(String[] args) { SpringApplication.run(PixelLifeApplication.class, args); }
}
